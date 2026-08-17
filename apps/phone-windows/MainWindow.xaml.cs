using Microsoft.UI;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using PhoneWindows.Controls;
using PhoneWindows.Services;
using PhoneWindows.ViewModels;
using Windows.Graphics;
using Windows.System;
using WinRT.Interop;

namespace PhoneWindows;

public sealed partial class MainWindow : Window
{
    public PhoneViewModel ViewModel { get; } = new();
    private readonly AppWindow _appWindow;
    private readonly TrayIconService _trayIcon;
    private readonly HashSet<Window> _toolWindows = [];
    private Window? _incomingWindow;
    private bool _exitRequested;
    private bool _initializationStarted;

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
        _trayIcon = new TrayIconService(hwnd, iconPath,
            () => DispatcherQueue.TryEnqueue(ShowFromTray),
            () => DispatcherQueue.TryEnqueue(ExitFromTray));
        _appWindow.Closing += (_, args) =>
        {
            if (_exitRequested) return;
            args.Cancel = true;
            HideInTray();
        };

        ViewModel.Changed += RefreshUi;
        ViewModel.IncomingCall += ShowIncomingCall;
        Closed += (_, _) =>
        {
            _trayIcon.Dispose();
            foreach (var window in _toolWindows.ToArray()) window.Close();
            ViewModel.Dispose();
        };
        Activated += (_, _) => Root.Focus(FocusState.Programmatic);
        Root.Loaded += Root_Loaded;
    }

    private async void Root_Loaded(object sender, RoutedEventArgs e)
    {
        if (_initializationStarted) return;
        _initializationStarted = true;
        Root.Loaded -= Root_Loaded;
        try
        {
            await InitializeAsync();
        }
        catch (Exception exception)
        {
            await ShowUiErrorAsync("Não foi possível inicializar o Phone.", exception);
        }
    }

    private void HideInTray()
    {
        foreach (var window in _toolWindows.ToArray())
        {
            if (!ReferenceEquals(window, _incomingWindow)) window.Close();
        }
        _appWindow.Hide();
    }

    private void ShowFromTray()
    {
        _appWindow.Show();
        Activate();
        Root.Focus(FocusState.Programmatic);
    }

    private void ExitFromTray()
    {
        _exitRequested = true;
        _trayIcon.Dispose();
        Close();
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
            if (ViewModel.CallState != Models.PhoneCallState.Incoming && _incomingWindow is not null)
            {
                _incomingWindow.Close();
                _incomingWindow = null;
            }
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
        try
        {
            ShowToolWindow("Configurações do Phone", new SettingsPanel(ViewModel), 540, 650);
        }
        catch (Exception exception)
        {
            await ShowUiErrorAsync("Não foi possível abrir as configurações.", exception);
        }
    }

    private void Contacts_Click(object sender, RoutedEventArgs e)
    {
        var panel = new ContactsPanel();
        var window = ShowToolWindow("Contatos", panel, 500, 560);
        panel.NumberSelected += number =>
        {
            ViewModel.Number = number;
            window.Close();
        };
        Root.Focus(FocusState.Programmatic);
    }

    private void History_Click(object sender, RoutedEventArgs e)
    {
        var panel = new HistoryPanel(ViewModel);
        var window = ShowToolWindow("Histórico", panel, 500, 560);
        panel.NumberSelected += number =>
        {
            ViewModel.Number = number;
            window.Close();
        };
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
        DispatcherQueue.TryEnqueue(() =>
        {
            _incomingWindow?.Close();

            var title = new TextBlock
            {
                Text = "Chamada recebida",
                FontSize = 15,
                FontWeight = Microsoft.UI.Text.FontWeights.SemiBold,
                HorizontalAlignment = HorizontalAlignment.Center
            };
            var caller = new TextBlock
            {
                Text = number,
                FontSize = 30,
                HorizontalAlignment = HorizontalAlignment.Center,
                TextTrimming = TextTrimming.CharacterEllipsis
            };
            var decline = new Button
            {
                Content = "Recusar",
                Width = 120,
                Height = 42,
                CornerRadius = new CornerRadius(21),
                Background = new SolidColorBrush(ColorHelper.FromArgb(255, 220, 38, 38)),
                Foreground = new SolidColorBrush(Colors.White)
            };
            var answer = new Button
            {
                Content = "Atender",
                Width = 120,
                Height = 42,
                CornerRadius = new CornerRadius(21),
                Background = new SolidColorBrush(ColorHelper.FromArgb(255, 0, 133, 59)),
                Foreground = new SolidColorBrush(Colors.White)
            };
            var buttons = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Center,
                Spacing = 12
            };
            buttons.Children.Add(decline);
            buttons.Children.Add(answer);
            var content = new StackPanel
            {
                Spacing = 16,
                Padding = new Thickness(12, 10, 12, 10),
                VerticalAlignment = VerticalAlignment.Center
            };
            content.Children.Add(title);
            content.Children.Add(caller);
            content.Children.Add(buttons);

            // A altura informada ao AppWindow inclui a barra de título. Reserve
            // espaço suficiente para os botões em escalas de tela acima de 100%.
            var window = CreateWindow("Phone · Chamada", content, 350, 270, alwaysOnTop: true, showCloseButton: false);
            _incomingWindow = window;
            var actionTaken = false;
            decline.Click += (_, _) =>
            {
                actionTaken = true;
                ViewModel.EndIncomingCall();
                window.Close();
            };
            answer.Click += (_, _) =>
            {
                actionTaken = true;
                ViewModel.Answer();
                window.Close();
            };
            window.Closed += (_, _) =>
            {
                if (!actionTaken && ViewModel.CallState == Models.PhoneCallState.Incoming)
                    ViewModel.EndIncomingCall();
                if (ReferenceEquals(_incomingWindow, window)) _incomingWindow = null;
            };
        });
    }

    private Window ShowToolWindow(string title, UIElement content, int width, int height) =>
        CreateWindow(title, content, width, height, alwaysOnTop: false, showCloseButton: true);

    private Window CreateWindow(string title, UIElement content, int width, int height, bool alwaysOnTop, bool showCloseButton)
    {
        var window = new Window { Title = title };
        var root = new Grid
        {
            Padding = new Thickness(18, 16, 18, 14),
            RequestedTheme = ElementTheme.Light,
            Background = new SolidColorBrush(ColorHelper.FromArgb(255, 250, 250, 250))
        };
        root.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
        if (showCloseButton) root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        root.Children.Add(content);

        if (showCloseButton)
        {
            var close = new Button
            {
                Content = "Fechar",
                HorizontalAlignment = HorizontalAlignment.Right,
                Margin = new Thickness(0, 12, 0, 0),
                MinWidth = 88
            };
            close.Click += (_, _) => window.Close();
            Grid.SetRow(close, 1);
            root.Children.Add(close);
        }

        window.Content = root;
        var hwnd = WindowNative.GetWindowHandle(window);
        var windowId = Win32Interop.GetWindowIdFromWindow(hwnd);
        var appWindow = AppWindow.GetFromWindowId(windowId);
        appWindow.Resize(new SizeInt32(width, height));
        var iconPath = Path.Combine(AppContext.BaseDirectory, "Assets", "Phone.ico");
        if (File.Exists(iconPath)) appWindow.SetIcon(iconPath);
        if (appWindow.Presenter is OverlappedPresenter presenter)
        {
            presenter.IsResizable = false;
            presenter.IsMaximizable = false;
            presenter.IsAlwaysOnTop = alwaysOnTop;
        }

        var display = DisplayArea.GetFromWindowId(_appWindow.Id, DisplayAreaFallback.Primary);
        if (display is not null)
        {
            var x = display.WorkArea.X + (display.WorkArea.Width - width) / 2;
            var y = display.WorkArea.Y + (display.WorkArea.Height - height) / 2;
            appWindow.Move(new PointInt32(x, y));
        }

        _toolWindows.Add(window);
        window.Closed += (_, _) => _toolWindows.Remove(window);
        window.Activate();
        return window;
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
        if (Root.XamlRoot is null)
        {
            Services.CrashReporter.LogMessage(
                ViewModel.ErrorMessage,
                "Erro do Phone aguardando a interface ficar disponível");
            return;
        }
        var message = ViewModel.ErrorMessage;
        await NewDialog("Phone", new TextBlock { Text = message, TextWrapping = TextWrapping.Wrap }, "OK").ShowAsync();
        ViewModel.ClearError();
    }

    private async Task ShowUiErrorAsync(string message, Exception exception)
    {
        Services.CrashReporter.Log(exception, message);
        if (Root.XamlRoot is null) return;
        await NewDialog("Phone", new TextBlock { Text = message, TextWrapping = TextWrapping.Wrap }, "Fechar").ShowAsync();
    }
}
