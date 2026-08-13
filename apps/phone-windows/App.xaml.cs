using Microsoft.UI.Xaml;
using PhoneWindows.Services;

namespace PhoneWindows;

public partial class App : Application
{
    public static MainWindow? MainWindow { get; private set; }

    public App()
    {
        InitializeComponent();
        UnhandledException += (_, args) =>
        {
            CrashReporter.ShowStartupError(args.Exception);
            args.Handled = true;
        };
        AppDomain.CurrentDomain.UnhandledException += (_, args) =>
        {
            if (args.ExceptionObject is Exception exception)
                CrashReporter.Log(exception, "Erro não tratado no processo");
        };
        TaskScheduler.UnobservedTaskException += (_, args) =>
        {
            CrashReporter.Log(args.Exception, "Erro em tarefa assíncrona");
            args.SetObserved();
        };
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        try
        {
            MainWindow = new MainWindow();
            MainWindow.Activate();
        }
        catch (Exception exception)
        {
            CrashReporter.ShowStartupError(exception);
        }
    }
}
