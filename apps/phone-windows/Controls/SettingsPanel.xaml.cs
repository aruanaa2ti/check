using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using PhoneWindows.Models;
using PhoneWindows.Services;
using PhoneWindows.ViewModels;

namespace PhoneWindows.Controls;

public sealed partial class SettingsPanel : UserControl
{
    private readonly PhoneViewModel _viewModel;
    private bool _loading = true;

    public SettingsPanel(PhoneViewModel viewModel)
    {
        _viewModel = viewModel;
        InitializeComponent();
        Loaded += (_, _) => LoadValues();
        Loaded += (_, _) =>
        {
            _viewModel.Changed += ViewModel_Changed;
            _viewModel.AudioDevicesRefreshed += AudioDevices_Refreshed;
        };
        Unloaded += (_, _) =>
        {
            _viewModel.Changed -= ViewModel_Changed;
            _viewModel.AudioDevicesRefreshed -= AudioDevices_Refreshed;
        };
    }

    private void ViewModel_Changed() => DispatcherQueue.TryEnqueue(UpdateRegistrationState);

    private void AudioDevices_Refreshed() => DispatcherQueue.TryEnqueue(LoadAudioDevices);

    private void LoadValues()
    {
        _loading = true;
        var account = _viewModel.Account;
        ExtensionBox.Text = account?.Extension ?? "";
        UserBox.Text = account?.AuthUser ?? "";
        PasswordBox.Password = account?.Password ?? "";
        HostBox.Text = account?.Host ?? "";
        PortBox.Value = account?.Port ?? 5060;
        TransportBox.SelectedIndex = account?.Transport.ToLowerInvariant() switch { "tcp" => 1, "tls" => 2, _ => 0 };
        RegistrationToggle.IsOn = _viewModel.RegistrationEnabled;
        StartupToggle.IsOn = StartupService.IsEnabled || _viewModel.StartWithWindows;
        RemoveButton.Visibility = account is null ? Visibility.Collapsed : Visibility.Visible;
        UpdateRegistrationState();
        LoadAudioDevices();
        _loading = false;
    }

    private void UpdateRegistrationState()
    {
        var account = _viewModel.Account;
        CurrentStateText.Text = account is null
            ? _viewModel.StatusLabel
            : $"{account.Extension} · {_viewModel.StatusLabel} · {account.Host}:{account.Port}/{account.Transport.ToUpperInvariant()}";
        if (_viewModel.Registration == RegistrationState.Failed)
        {
            MessageText.Text = string.IsNullOrWhiteSpace(_viewModel.RegistrationMessage)
                ? "O PABX recusou o registro SIP."
                : _viewModel.RegistrationMessage;
            MessageText.Foreground = new Microsoft.UI.Xaml.Media.SolidColorBrush(
                Microsoft.UI.ColorHelper.FromArgb(255, 204, 34, 34));
        }
    }

    private void LoadAudioDevices()
    {
        var wasLoading = _loading;
        _loading = true;
        FillAudioCombo(MicrophoneBox, _viewModel.AudioDevices.Where(device => device.CanRecord), _viewModel.MicrophoneId);
        FillAudioCombo(OutputBox, _viewModel.AudioDevices.Where(device => device.CanPlay), _viewModel.CallOutputId);
        FillAudioCombo(RingerBox, _viewModel.AudioDevices.Where(device => device.CanPlay), _viewModel.RingerId);
        _loading = wasLoading;
    }

    private static void FillAudioCombo(ComboBox combo, IEnumerable<PhoneAudioDevice> devices, string selectedId)
    {
        combo.Items.Clear();
        foreach (var device in devices)
        {
            var item = new ComboBoxItem { Content = device.IsUsb ? $"{device.Name} · USB" : device.Name, Tag = device.Id };
            combo.Items.Add(item);
            if (device.Id == selectedId) combo.SelectedItem = item;
        }
    }

    private async void Save_Click(object sender, RoutedEventArgs e)
    {
        var extension = ExtensionBox.Text.Trim();
        var user = string.IsNullOrWhiteSpace(UserBox.Text) ? extension : UserBox.Text.Trim();
        var transport = (TransportBox.SelectedItem as ComboBoxItem)?.Tag?.ToString() ?? "udp";
        if (extension.Length == 0 || PasswordBox.Password.Length == 0 || HostBox.Text.Trim().Length == 0 || double.IsNaN(PortBox.Value))
        {
            ShowMessage("Preencha ramal, senha, servidor e porta.", true);
            return;
        }

        await _viewModel.SaveAccountAsync(new SipAccount(
            extension, user, PasswordBox.Password, HostBox.Text.Trim(), (int)PortBox.Value,
            transport, $"Ramal {extension}"));
        ShowMessage("Configuração salva. Verifique o estado do ramal.", false);
        LoadValues();
    }

    private async void Provision_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var account = await ProvisioningClient.ProvisionAsync(QrValueBox.Text);
            await _viewModel.SaveAccountAsync(account);
            ShowMessage("Ramal configurado pelo QR Code.", false);
            LoadValues();
        }
        catch (Exception exception) { ShowMessage(exception.Message, true); }
    }

    private async void RegistrationToggle_Toggled(object sender, RoutedEventArgs e)
    {
        if (_loading) return;
        await _viewModel.SetRegistrationEnabledAsync(RegistrationToggle.IsOn);
        LoadValues();
    }

    private async void StartupToggle_Toggled(object sender, RoutedEventArgs e)
    {
        if (_loading) return;
        try { await _viewModel.SetStartWithWindowsAsync(StartupToggle.IsOn); }
        catch (Exception exception) { ShowMessage(exception.Message, true); }
    }

    private async void Remove_Click(object sender, RoutedEventArgs e)
    {
        await _viewModel.RemoveAccountAsync();
        LoadValues();
        ShowMessage("Configuração removida.", false);
    }

    private async void MicrophoneBox_SelectionChanged(object sender, SelectionChangedEventArgs e) =>
        await SelectAudioAsync(MicrophoneBox, AudioRoute.Microphone);
    private async void OutputBox_SelectionChanged(object sender, SelectionChangedEventArgs e) =>
        await SelectAudioAsync(OutputBox, AudioRoute.CallOutput);
    private async void RingerBox_SelectionChanged(object sender, SelectionChangedEventArgs e) =>
        await SelectAudioAsync(RingerBox, AudioRoute.Ringer);

    private async Task SelectAudioAsync(ComboBox combo, AudioRoute route)
    {
        if (_loading || combo.SelectedItem is not ComboBoxItem { Tag: string id }) return;
        try
        {
            await _viewModel.SelectAudioDeviceAsync(id, route);
            ShowMessage("Dispositivo de áudio selecionado.", false);
        }
        catch (Exception exception)
        {
            CrashReporter.Log(exception, $"Falha ao selecionar áudio ({route})");
            ShowMessage("Não foi possível selecionar este dispositivo de áudio.", true);
        }
    }

    private void ShowMessage(string message, bool error)
    {
        MessageText.Text = message;
        MessageText.Foreground = new Microsoft.UI.Xaml.Media.SolidColorBrush(error
            ? Microsoft.UI.ColorHelper.FromArgb(255, 204, 34, 34)
            : Microsoft.UI.ColorHelper.FromArgb(255, 0, 133, 59));
    }
}
