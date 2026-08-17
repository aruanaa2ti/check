#if LINPHONE_SDK
using Microsoft.UI.Dispatching;
using PhoneWindows.Models;
using Linphone;
using ModelRegistrationState = PhoneWindows.Models.RegistrationState;
using ModelCallState = PhoneWindows.Models.PhoneCallState;

namespace PhoneWindows.Services;

public sealed class LinphoneSipEngine : IPhoneSipEngine
{
    private Core? _core;
    private SipAccount? _account;
    private string? _previousOutputDeviceId;
    private readonly DispatcherQueue _dispatcherQueue;
    private readonly DispatcherQueueTimer _iterateTimer;

    public event Action<ModelRegistrationState, string?>? RegistrationChanged;
    public event Action<ModelCallState, string?>? CallChanged;
    public event Action? AudioDevicesChanged;

    public LinphoneSipEngine()
    {
        var queue = DispatcherQueue.GetForCurrentThread()
                    ?? throw new InvalidOperationException("O motor SIP deve ser criado na interface principal.");
        _dispatcherQueue = queue;
        _iterateTimer = queue.CreateTimer();
        _iterateTimer.Interval = TimeSpan.FromMilliseconds(20);
        _iterateTimer.IsRepeating = true;
        _iterateTimer.Tick += (_, _) => _core?.Iterate();
    }

    public Task StartAsync(SipAccount account)
    {
        Stop();
        RegistrationChanged?.Invoke(ModelRegistrationState.Connecting, null);

        CrashReporter.LogMessage("Obtendo Factory.Instance.", "SIP 0.1.6 · etapa 1");
        var factory = Factory.Instance;
        CrashReporter.LogMessage("Criando Core com recursos nativos empacotados.", "SIP 0.1.6 · etapa 2");
        _core = factory.CreateCore("", "", IntPtr.Zero);
        CrashReporter.LogMessage("Configurando Core e listeners.", "SIP 0.1.6 · etapa 3");
        _core.Ipv6Enabled = false;
        _core.UseRfc2833ForDtmf = true;
        _core.UseInfoForDtmf = false;
        _core.SetUserAgent("Phone A2", "0.1.6 (Linphone 5.3.19)");
        _core.Listener.OnAccountRegistrationStateChanged = OnRegistrationStateChanged;
        _core.Listener.OnCallStateChanged = OnCallStateChanged;
        _core.Listener.OnAudioDevicesListUpdated = _ =>
            _dispatcherQueue.TryEnqueue(() => AudioDevicesChanged?.Invoke());
        CrashReporter.LogMessage("Iniciando Core.", "SIP 0.1.6 · etapa 4");
        _core.Start();
        CrashReporter.LogMessage("Core iniciado; configurando conta.", "SIP 0.1.6 · etapa 5");

        // O PABX desafia o REGISTER usando o domínio SIP. No Windows, deixar o
        // domínio vazio pode impedir o Linphone de associar a credencial recebida
        // pelo QR Code à resposta 401/407.
        var auth = factory.CreateAuthInfo(
            account.Extension, account.AuthUser, account.Password,
            null, null, account.Host);
        _core.AddAuthInfo(auth);
        // Algumas centrais respondem com um realm diferente do host público.
        // Mantenha também uma credencial sem domínio para aceitar esse desafio.
        var fallbackAuth = factory.CreateAuthInfo(
            account.Extension, account.AuthUser, account.Password,
            null, null, null);
        _core.AddAuthInfo(fallbackAuth);

        var parameters = _core.CreateAccountParams();
        var identity = factory.CreateAddress($"sip:{account.Extension}@{account.Host}")
                       ?? throw new InvalidOperationException("Identidade SIP inválida.");
        identity.DisplayName = account.DisplayName;
        parameters.IdentityAddress = identity;
        parameters.ServerAddress = factory.CreateAddress(
            $"sip:{account.Host}:{account.Port};transport={account.Transport.ToLowerInvariant()}")
            ?? throw new InvalidOperationException("Servidor SIP inválido.");
        parameters.RegisterEnabled = true;
        parameters.Expires = account.RegisterExpires;

        var linphoneAccount = _core.CreateAccount(parameters);
        _core.AddAccount(linphoneAccount);
        _core.DefaultAccount = linphoneAccount;
        _account = account;
        CrashReporter.LogMessage("Conta adicionada; iniciando Iterate.", "SIP 0.1.6 · etapa 6");
        _iterateTimer.Start();
        return Task.CompletedTask;
    }

    public Task CallAsync(string number)
    {
        if (_core is null || _account is null || string.IsNullOrWhiteSpace(number)) return Task.CompletedTask;
        var uri = number.Contains('@') ? $"sip:{number}" : $"sip:{number}@{_account.Host}";
        var address = Factory.Instance.CreateAddress(uri)
                      ?? throw new InvalidOperationException("Número SIP inválido.");
        if (_core.InviteAddress(address) is null) throw new InvalidOperationException("Não foi possível iniciar a chamada.");
        return Task.CompletedTask;
    }

    public void Answer()
    {
        var call = _core?.CurrentCall ?? throw new InvalidOperationException("Não há chamada para atender.");
        call.Accept();
    }

    public void SendDtmf(char digit)
    {
        if (!"0123456789*#".Contains(digit)) throw new ArgumentException("Tom DTMF inválido.");
        var call = _core?.CurrentCall ?? throw new InvalidOperationException("Não há chamada ativa.");
        call.SendDtmf(unchecked((sbyte)digit));
    }

    public Task TransferAsync(string number)
    {
        if (_core?.CurrentCall is not { } call || _account is null) return Task.CompletedTask;
        var uri = number.Contains('@') ? $"sip:{number}" : $"sip:{number}@{_account.Host}";
        var address = Factory.Instance.CreateAddress(uri)
                      ?? throw new InvalidOperationException("Destino SIP inválido.");
        call.TransferTo(address);
        return Task.CompletedTask;
    }

    public void EndCall()
    {
        _core?.CurrentCall?.Terminate();
        CallChanged?.Invoke(ModelCallState.Idle, null);
    }

    public IReadOnlyList<PhoneAudioDevice> GetAudioDevices()
    {
        if (_core is null) return [];
        return _core.ExtendedAudioDevices.Select(device => new PhoneAudioDevice(
            device.Id,
            string.IsNullOrWhiteSpace(device.DeviceName) ? device.Id : device.DeviceName,
            device.Capabilities.HasFlag(AudioDeviceCapabilities.CapabilityRecord),
            device.Capabilities.HasFlag(AudioDeviceCapabilities.CapabilityPlay),
            device.Type == AudioDeviceType.GenericUsb || device.DeviceName.Contains("USB", StringComparison.OrdinalIgnoreCase)
        )).ToList();
    }

    public void SelectAudioDevice(string id, AudioRoute route)
    {
        var device = _core?.ExtendedAudioDevices.FirstOrDefault(candidate => candidate.Id == id);
        if (_core is null || device is null) return;
        switch (route)
        {
            case AudioRoute.Microphone:
                _core.DefaultInputAudioDevice = device;
                _core.InputAudioDevice = device;
                break;
            case AudioRoute.CallOutput:
                _core.DefaultOutputAudioDevice = device;
                _core.OutputAudioDevice = device;
                break;
            case AudioRoute.Ringer:
                _core.RingerDevice = device.Id;
                break;
        }
    }

    public bool SetSpeakerEnabled(bool enabled)
    {
        if (_core is null) return false;
        var devices = _core.ExtendedAudioDevices;
        if (enabled)
        {
            _previousOutputDeviceId = _core.OutputAudioDevice?.Id;
            var speaker = devices.FirstOrDefault(device =>
                device.Capabilities.HasFlag(AudioDeviceCapabilities.CapabilityPlay) &&
                (device.DeviceName.Contains("speaker", StringComparison.OrdinalIgnoreCase) ||
                 device.DeviceName.Contains("alto-falante", StringComparison.OrdinalIgnoreCase)));
            if (speaker is null) return false;
            _core.OutputAudioDevice = speaker;
        }
        else
        {
            var previous = devices.FirstOrDefault(device => device.Id == _previousOutputDeviceId);
            if (previous is not null) _core.OutputAudioDevice = previous;
            _previousOutputDeviceId = null;
        }
        return true;
    }

    public void Stop()
    {
        _iterateTimer.Stop();
        if (_core is not null)
        {
            _core.Stop();
            _core = null;
        }
        _account = null;
        _previousOutputDeviceId = null;
        CallChanged?.Invoke(ModelCallState.Idle, null);
        RegistrationChanged?.Invoke(ModelRegistrationState.NotConfigured, null);
    }

    public void Dispose() => Stop();

    private void OnRegistrationStateChanged(Core core, Account account, Linphone.RegistrationState state, string message)
    {
        RegistrationChanged?.Invoke(state switch
        {
            Linphone.RegistrationState.Ok => ModelRegistrationState.Connected,
            Linphone.RegistrationState.Progress or Linphone.RegistrationState.Refreshing => ModelRegistrationState.Connecting,
            Linphone.RegistrationState.Failed => ModelRegistrationState.Failed,
            _ => ModelRegistrationState.NotConfigured
        }, message);
    }

    private void OnCallStateChanged(Core core, Linphone.Call call, CallState state, string message)
    {
        var remote = call.RemoteAddress?.Username ?? "Desconhecido";
        var mapped = state switch
        {
            CallState.IncomingReceived or CallState.PushIncomingReceived => ModelCallState.Incoming,
            CallState.OutgoingInit or CallState.OutgoingProgress or CallState.OutgoingRinging or CallState.OutgoingEarlyMedia => ModelCallState.Dialing,
            CallState.Connected or CallState.StreamsRunning => ModelCallState.Connected,
            CallState.End or CallState.Released or CallState.Error => ModelCallState.Idle,
            _ => (ModelCallState?)null
        };
        if (mapped is not null) CallChanged?.Invoke(mapped.Value, remote);
    }
}
#endif
