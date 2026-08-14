using Microsoft.UI.Xaml;
using PhoneWindows.Services;

namespace PhoneWindows;

public partial class App : Application
{
    public static MainWindow? MainWindow { get; private set; }

    public App()
    {
        RequestedTheme = ApplicationTheme.Light;
        InitializeComponent();
        UnhandledException += (_, args) =>
        {
            // Um erro de uma tela secundária não deve exibir a caixa antiga do
            // Windows nem derrubar o softphone. O diagnóstico continua salvo.
            CrashReporter.Log(args.Exception, "Erro na interface do Phone");
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
