using Microsoft.UI;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using PhoneWindows.Controls;
using PhoneWindows.ViewModels;
using Windows.Graphics;
using Windows.System;
using WinRT.Interop;

namespace PhoneWindows;

public sealed partial class MainWindow : Window
{
    public PhoneViewModel ViewModel { get; } = new();
    private readonly AppWindow _appWindow;

    public MainWindow()
    {
        InitializeComponent();
        var hwnd = WindowNative.GetWindowHandle(this);
        var windowId = Win32Interop.GetWindowIdFromWindow(hwnd);
        _appWindow = AppWindow.GetFromWindowId(windowId);
        _appWindow.Resize(new SizeInt32(296, 540));
        _appWindow.Title = "Phone";
        var iconPath = Path.Combine(AppContext.BaseDirectory, "Assets", "Phone.ico");
        if (File.Exists(iconPath)) _appWindow.SetIcon(iconPath);

        ViewModel.Changed += RefreshUi;
        ViewModel.IncomingCall += ShowIncomingCall;
        Closed += (_, _) => ViewModel.Dispose();
        Activated += (_, _) => Root.Focus(FocusState.Programmatic);
        _ = InitializeAsync();
    }

    private async Task InitializeAsync()
    {
        await ViewModel.InitializeAsync();
        RefreshUi();
        await ShowErrorIfNeededAsync();
        Root.Focus(FocusState.Programmatic);
    }

    private void RefreshUi()
    {
        DispatcherQueue.TryEnqueue(() =>
        {
            StatusText.Text = ViewModel.StatusLabel;
            ExtensionText.Text = ViewModel.ExtensionLabel;
            ExtensionText.Visibility = string.IsNullOrEmpty(ViewModel.ExtensionLabel) ? Visibility.Collapsed : Visibility.Visible;
            NumberText.Text = ViewModel.Number;
            NumberText.FontSize = ViewModel.Number.Length > 16 ? 23 : 29;
            StatusDot.Fill = new SolidColorBrush(ViewModel.Registration switch
            {
                Models.RegistrationState.Connected => ColorHelper.FromArgb(255, 35, 197, 94),
                Models.RegistrationState.Connecting => ColorHelper.FromArgb(255, 245, 158, 11),
                Models.RegistrationState.Failed => ColorHelper.FromArgb(255, 239, 68, 68),
                _ => ColorHelper.FromArgb(255, 153, 153, 153)
            });
            CallButton.IsEnabled = ViewModel.CanCall;
            CallButton.Background = new SolidColorBrush(ViewModel.IsCallActive
                ? ColorHelper.FromArgb(255, 220, 38, 38)
                : ColorHelper.FromArgb(255, 0, 133, 59));
            CallIcon.Glyph = ViewModel.IsCallActive ? "\uE778" : "\uE717";
            DeleteButton.Opacity = ViewModel.Number.Length == 0 ? 0 : 1;
            TransferButton.Visibility = ViewModel.CallState == Models.PhoneCallState.Connected
                ? Visibility.Visible : Visibility.Collapsed;
            SpeakerButton.Visibility = ViewModel.IsCallActive ? Visibility.Visible : Visibility.Collapsed;
            SpeakerText.Text = ViewModel.SpeakerEnabled ? "Viva-voz ligado" : "Viva-voz";
            SpeakerButton.Opacity = ViewModel.SpeakerEnabled ? 1 : 0.72;
        });
    }

    private void Dial_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button { Tag: string digit }) ViewModel.Append(digit);
        Root.Focus(FocusState.Programmatic);
    }

    private async void Call_Click(object sender, RoutedEventArgs e)
    {
        await ViewModel.ToggleCallAsync();
        await ShowErrorIfNeededAsync();
        Root.Focus(FocusState.Programmatic);
    }

    private void Delete_Click(object sender, RoutedEventArgs e) => DeleteDigit();
    private void Backspace_Invoked(KeyboardAccelerator sender, KeyboardAcceleratorInvokedEventArgs args)
    {
        DeleteDigit();
        args.Handled = true;
    }

    private void DeleteDigit()
    {
        ViewModel.DeleteDigit();
        Root.Focus(FocusState.Programmatic);
    }

    private async void Settings_Click(object sender, RoutedEventArgs e)
    {
        var panel = new SettingsPanel(ViewModel);
        var dialog = NewDialog("Phone", panel, "Concluir");
        await dialog.ShowAsync();
        RefreshUi();
        await ShowErrorIfNeededAsync();
    }

    private async void Contacts_Click(object sender, RoutedEventArgs e)
    {
        var panel = new ContactsPanel();
        var dialog = NewDialog("Contatos", panel, "Fechar");
        panel.NumberSelected += number =>
        {
            ViewModel.Number = number;
            dialog.Hide();
        };
        await dialog.ShowAsync();
        Root.Focus(FocusState.Programmatic);
    }

    private async void History_Click(object sender, RoutedEventArgs e)
    {
        var panel = new HistoryPanel(ViewModel);
        var dialog = NewDialog("Histórico", panel, "Fechar");
        panel.NumberSelected += number =>
        {
            ViewModel.Number = number;
            dialog.Hide();
        };
        await dialog.ShowAsync();
        Root.Focus(FocusState.Programmatic);
    }

    private async void Transfer_Click(object sender, RoutedEventArgs e)
    {
        var field = new TextBox { PlaceholderText = "Ramal ou número" };
        var dialog = NewDialog("Transferir chamada", field, "Cancelar");
        dialog.PrimaryButtonText = "Transferir";
        dialog.PrimaryButtonClick += async (_, args) =>
        {
            if (string.IsNullOrWhiteSpace(field.Text)) { args.Cancel = true; return; }
            await ViewModel.TransferAsync(field.Text);
        };
        await dialog.ShowAsync();
        await ShowErrorIfNeededAsync();
    }

    private async void Speaker_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.ToggleSpeaker();
        await ShowErrorIfNeededAsync();
    }

    private void Root_KeyDown(object sender, KeyRoutedEventArgs e)
    {
        if (e.Key is >= VirtualKey.Number0 and <= VirtualKey.Number9)
        {
            ViewModel.Append(((int)e.Key - (int)VirtualKey.Number0).ToString());
            e.Handled = true;
        }
        else if (e.Key is >= VirtualKey.NumberPad0 and <= VirtualKey.NumberPad9)
        {
            ViewModel.Append(((int)e.Key - (int)VirtualKey.NumberPad0).ToString());
            e.Handled = true;
        }
        else if (e.Key is VirtualKey.Back or VirtualKey.Delete)
        {
            ViewModel.DeleteDigit();
            e.Handled = true;
        }
        else if (e.Key == VirtualKey.Enter)
        {
            _ = ViewModel.ToggleCallAsync();
            e.Handled = true;
        }
    }

    private void ShowIncomingCall(string number)
    {
        DispatcherQueue.TryEnqueue(async () =>
        {
            _appWindow.Show();
            Activate();
            var dialog = NewDialog("Chamada recebida", new TextBlock
            {
                Text = number,
                FontSize = 26,
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 18, 0, 18)
            }, "Recusar");
            dialog.PrimaryButtonText = "Atender";
            var result = await dialog.ShowAsync();
            if (result == ContentDialogResult.Primary) ViewModel.Answer();
            else ViewModel.EndIncomingCall();
        });
    }

    private ContentDialog NewDialog(string title, object content, string closeText) => new()
    {
        Title = title,
        Content = content,
        CloseButtonText = closeText,
        XamlRoot = Root.XamlRoot,
        RequestedTheme = Root.ActualTheme
    };

    private async Task ShowErrorIfNeededAsync()
    {
        if (string.IsNullOrWhiteSpace(ViewModel.ErrorMessage)) return;
        var message = ViewModel.ErrorMessage;
        ViewModel.ClearError();
        await NewDialog("Phone", new TextBlock { Text = message, TextWrapping = TextWrapping.Wrap }, "OK").ShowAsync();
    }
}
