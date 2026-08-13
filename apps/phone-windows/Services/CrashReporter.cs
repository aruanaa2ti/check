using System.Runtime.InteropServices;
using System.Text;

namespace PhoneWindows.Services;

internal static class CrashReporter
{
    private static readonly string Folder = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "A2TI", "Phone");

    internal static string Log(Exception exception, string context)
    {
        try
        {
            Directory.CreateDirectory(Folder);
            var path = Path.Combine(Folder, "phone-error.log");
            var message = new StringBuilder()
                .AppendLine($"[{DateTimeOffset.Now:O}] {context}")
                .AppendLine(exception.ToString())
                .AppendLine(new string('-', 72))
                .ToString();
            File.AppendAllText(path, message);
            return path;
        }
        catch
        {
            return Path.Combine(Folder, "phone-error.log");
        }
    }

    internal static void ShowStartupError(Exception exception)
    {
        var path = Log(exception, "Falha ao iniciar o Phone");
        MessageBox(IntPtr.Zero,
            $"O Phone encontrou um erro ao iniciar, mas agora registrou o motivo.\n\n{exception.Message}\n\nDiagnóstico: {path}",
            "Phone", 0x10);
    }

    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "MessageBoxW")]
    private static extern int MessageBox(IntPtr window, string text, string caption, uint type);
}
