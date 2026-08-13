using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using PhoneWindows.Models;
using PhoneWindows.Services;

namespace PhoneWindows.ViewModels;

public sealed class PhoneViewModel : INotifyPropertyChanged, IDisposable
{
    private readonly IPhoneSipEngine _engine;
    private readonly SettingsStore _settings = new();
    private readonly HistoryStore _historyStore = new();
    private readonly IncomingCallNotifier _notifier = new();
    private PhonePreferences _preferences = new();
    private Guid? _activeHistoryId;
    private string _number = "";
    private RegistrationState _registration = RegistrationState.NotConfigured;
    private PhoneCallState _callState = PhoneCallState.Idle;
    private string? _errorMessage;
    private bool _speakerEnabled;

    public event PropertyChangedEventHandler? PropertyChanged;
    public event Action? Changed;
    public event Action<string>? IncomingCall;

    public ObservableCollection<CallHistoryItem> History { get; } = [];
    public ObservableCollection<PhoneAudioDevice> AudioDevices { get; } = [];

    public SipAccount? Account { get; private set; }
    public bool RegistrationEnabled => _preferences.RegistrationEnabled;
    public bool StartWithWindows => _preferences.StartWithWindows;
    public string MicrophoneId => _preferences.MicrophoneId;
    public string CallOutputId => _preferences.CallOutputId;
    public string RingerId => _preferences.RingerId;

    public string Number
    {
        get => _number;
        set
        {
            var clean = new string(value.Where(character => char.IsDigit(character) || character is '*' or '#' or '+').Take(32).ToArray());
            SetField(ref _number, clean);
        }
    }

    public RegistrationState Registration
    {
        get => _registration;
        private set => SetField(ref _registration, value);
    }

    public PhoneCallState CallState
    {
        get => _callState;
        private set => SetField(ref _callState, value);
    }

    public string? ErrorMessage
    {
        get => _errorMessage;
        private set => SetField(ref _errorMessage, value);
    }

    public string StatusLabel => Registration switch
    {
        RegistrationState.NotConfigured => "Configure seu ramal",
        RegistrationState.Disabled => "Desativado",
        RegistrationState.Connecting => "Conectando…",
        RegistrationState.Connected => "Conectado",
        _ => "Sem conexão"
    };

    public string ExtensionLabel => Account?.Extension ?? "";
    public bool IsCallActive => CallState != PhoneCallState.Idle;
    public bool CanCall => IsCallActive || (Number.Length > 0 && Registration == RegistrationState.Connected);
    public bool SpeakerEnabled => _speakerEnabled;

    public PhoneViewModel()
    {
        _engine = PhoneSipEngineFactory.Create();
        _engine.RegistrationChanged += (state, message) =>
        {
            Registration = state;
            if (state == RegistrationState.Failed) ErrorMessage = message;
            NotifyComputed();
        };
        _engine.CallChanged += HandleCallChanged;
        _engine.AudioDevicesChanged += RefreshAudioDevices;
        _notifier.Register();
    }

    public async Task InitializeAsync()
    {
        try { _preferences = await _settings.LoadPreferencesAsync(); }
        catch (Exception exception)
        {
            CrashReporter.Log(exception, "Preferências locais inválidas");
            _preferences = new PhonePreferences();
        }
        try { Account = await _settings.LoadAccountAsync(); }
        catch (Exception exception)
        {
            CrashReporter.Log(exception, "Conta SIP local inválida");
            Account = null;
        }
        try
        {
            foreach (var item in await _historyStore.LoadAsync()) History.Add(item);
        }
        catch (Exception exception)
        {
            CrashReporter.Log(exception, "Histórico local inválido");
            History.Clear();
        }
        if (Account is not null && RegistrationEnabled) await ConnectAsync();
        else Registration = Account is null ? RegistrationState.NotConfigured : RegistrationState.Disabled;
        NotifyComputed();
    }

    public void Append(string digit)
    {
        if (CallState == PhoneCallState.Connected)
        {
            try { _engine.SendDtmf(digit[0]); }
            catch (Exception exception) { ErrorMessage = exception.Message; }
            NotifyComputed();
            return;
        }
        if (Number.Length < 32) Number += digit;
        NotifyComputed();
    }

    public void DeleteDigit()
    {
        if (Number.Length > 0) Number = Number[..^1];
        NotifyComputed();
    }

    public async Task ToggleCallAsync()
    {
        ErrorMessage = null;
        try
        {
            if (IsCallActive) _engine.EndCall();
            else if (CanCall) await _engine.CallAsync(Number);
        }
        catch (Exception exception) { ErrorMessage = exception.Message; }
    }

    public void Answer()
    {
        try { _engine.Answer(); }
        catch (Exception exception) { ErrorMessage = exception.Message; }
    }

    public void EndIncomingCall() => _engine.EndCall();

    public void ToggleSpeaker()
    {
        var enabled = !_speakerEnabled;
        if (_engine.SetSpeakerEnabled(enabled)) _speakerEnabled = enabled;
        else ErrorMessage = "Alto-falante indisponível.";
        NotifyComputed();
    }

    public async Task TransferAsync(string destination)
    {
        try { await _engine.TransferAsync(destination); }
        catch (Exception exception) { ErrorMessage = exception.Message; }
    }

    public async Task SaveAccountAsync(SipAccount account)
    {
        ErrorMessage = null;
        await _settings.SaveAccountAsync(account);
        Account = account;
        if (RegistrationEnabled) await ConnectAsync();
        else Registration = RegistrationState.Disabled;
        NotifyComputed();
    }

    public async Task RemoveAccountAsync()
    {
        _engine.Stop();
        await _settings.RemoveAccountAsync();
        Account = null;
        Registration = RegistrationState.NotConfigured;
        NotifyComputed();
    }

    public async Task SetRegistrationEnabledAsync(bool enabled)
    {
        _preferences.RegistrationEnabled = enabled;
        await _settings.SavePreferencesAsync(_preferences);
        if (enabled && Account is not null) await ConnectAsync();
        else
        {
            _engine.Stop();
            Registration = Account is null ? RegistrationState.NotConfigured : RegistrationState.Disabled;
        }
        NotifyComputed();
    }

    public async Task SetStartWithWindowsAsync(bool enabled)
    {
        StartupService.SetEnabled(enabled);
        _preferences.StartWithWindows = enabled;
        await _settings.SavePreferencesAsync(_preferences);
        NotifyComputed();
    }

    public async Task SelectAudioDeviceAsync(string id, AudioRoute route)
    {
        switch (route)
        {
            case AudioRoute.Microphone: _preferences.MicrophoneId = id; break;
            case AudioRoute.CallOutput: _preferences.CallOutputId = id; break;
            case AudioRoute.Ringer: _preferences.RingerId = id; break;
        }
        _engine.SelectAudioDevice(id, route);
        await _settings.SavePreferencesAsync(_preferences);
        NotifyComputed();
    }

    public async Task DeleteHistoryItemAsync(Guid id)
    {
        var item = History.FirstOrDefault(candidate => candidate.Id == id);
        if (item is not null) History.Remove(item);
        await _historyStore.SaveAsync(History);
    }

    public async Task ClearHistoryAsync()
    {
        History.Clear();
        await _historyStore.SaveAsync(History);
    }

    public void ClearError() => ErrorMessage = null;

    private async Task ConnectAsync()
    {
        if (Account is null) return;
        Registration = RegistrationState.Connecting;
        try
        {
            await _engine.StartAsync(Account);
            RefreshAudioDevices();
        }
        catch (Exception exception)
        {
            Registration = RegistrationState.Failed;
            ErrorMessage = exception.Message;
        }
    }

    private void RefreshAudioDevices()
    {
        AudioDevices.Clear();
        foreach (var device in _engine.GetAudioDevices()) AudioDevices.Add(device);

        var recording = AudioDevices.Where(device => device.CanRecord).ToList();
        var playback = AudioDevices.Where(device => device.CanPlay).ToList();
        if (!recording.Any(device => device.Id == _preferences.MicrophoneId) && recording.FirstOrDefault(device => device.IsUsb) is { } microphone)
            _preferences.MicrophoneId = microphone.Id;
        if (!playback.Any(device => device.Id == _preferences.CallOutputId) && playback.FirstOrDefault(device => device.IsUsb) is { } output)
            _preferences.CallOutputId = output.Id;
        if (!playback.Any(device => device.Id == _preferences.RingerId) && playback.FirstOrDefault(device => !device.IsUsb) is { } ringer)
            _preferences.RingerId = ringer.Id;

        if (_preferences.MicrophoneId.Length > 0) _engine.SelectAudioDevice(_preferences.MicrophoneId, AudioRoute.Microphone);
        if (_preferences.CallOutputId.Length > 0) _engine.SelectAudioDevice(_preferences.CallOutputId, AudioRoute.CallOutput);
        if (_preferences.RingerId.Length > 0) _engine.SelectAudioDevice(_preferences.RingerId, AudioRoute.Ringer);
        _ = _settings.SavePreferencesAsync(_preferences);
        NotifyComputed();
    }

    private void HandleCallChanged(PhoneCallState state, string? remote)
    {
        var previous = CallState;
        CallState = state;
        if (state == PhoneCallState.Incoming)
        {
            var number = remote ?? "Desconhecido";
            _notifier.Show(number);
            IncomingCall?.Invoke(number);
            AddHistory(number, CallDirection.Incoming);
        }
        else if (state == PhoneCallState.Dialing)
        {
            AddHistory(remote ?? Number, CallDirection.Outgoing);
        }
        else if (state == PhoneCallState.Idle && previous != PhoneCallState.Idle)
        {
            _speakerEnabled = false;
            _activeHistoryId = null;
            _notifier.Clear();
            _ = _historyStore.SaveAsync(History);
        }
        NotifyComputed();
    }

    private void AddHistory(string number, CallDirection direction)
    {
        if (_activeHistoryId is not null) return;
        var item = new CallHistoryItem(Guid.NewGuid(), number, DateTimeOffset.Now, direction, TimeSpan.Zero);
        _activeHistoryId = item.Id;
        History.Insert(0, item);
        _ = _historyStore.SaveAsync(History);
    }

    private void NotifyComputed()
    {
        OnPropertyChanged(nameof(StatusLabel));
        OnPropertyChanged(nameof(ExtensionLabel));
        OnPropertyChanged(nameof(IsCallActive));
        OnPropertyChanged(nameof(CanCall));
        OnPropertyChanged(nameof(SpeakerEnabled));
        OnPropertyChanged(nameof(RegistrationEnabled));
        OnPropertyChanged(nameof(StartWithWindows));
        Changed?.Invoke();
    }

    private bool SetField<T>(ref T field, T value, [CallerMemberName] string? propertyName = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value)) return false;
        field = value;
        OnPropertyChanged(propertyName);
        Changed?.Invoke();
        return true;
    }

    private void OnPropertyChanged([CallerMemberName] string? propertyName = null) =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));

    public void Dispose()
    {
        _notifier.Unregister();
        _engine.Dispose();
    }
}
