using Microsoft.Windows.AppNotifications;
using Microsoft.Windows.AppNotifications.Builder;

namespace PhoneWindows.Services;

public sealed class IncomingCallNotifier
{
    private bool _registered;

    public void Register()
    {
        try
        {
            AppNotificationManager.Default.Register();
            _registered = true;
        }
        catch { }
    }

    public void Show(string number)
    {
        if (!_registered) return;
        try
        {
            var notification = new AppNotificationBuilder()
                .AddText("Chamada recebida")
                .AddText(number)
                .SetScenario(AppNotificationScenario.IncomingCall)
                .BuildNotification();
            AppNotificationManager.Default.Show(notification);
        }
        catch { }
    }

    public void Clear()
    {
        if (!_registered) return;
        try { AppNotificationManager.Default.RemoveAllAsync(); }
        catch { }
    }

    public void Unregister()
    {
        if (!_registered) return;
        try { AppNotificationManager.Default.Unregister(); }
        catch { }
    }
}
