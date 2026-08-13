namespace PhoneWindows.Models;

public sealed record SipAccount(
    string Extension,
    string AuthUser,
    string Password,
    string Host,
    int Port,
    string Transport,
    string DisplayName,
    int RegisterExpires = 600);

public enum RegistrationState
{
    NotConfigured,
    Disabled,
    Connecting,
    Connected,
    Failed
}

public enum PhoneCallState
{
    Idle,
    Incoming,
    Dialing,
    Connected
}

public enum CallDirection
{
    Outgoing,
    Incoming,
    Missed
}

public sealed record CallHistoryItem(
    Guid Id,
    string Number,
    DateTimeOffset Date,
    CallDirection Direction,
    TimeSpan Duration)
{
    public string DirectionGlyph => Direction switch
    {
        CallDirection.Incoming => "↙",
        CallDirection.Missed => "↙",
        _ => "↗"
    };

    public string DateLabel => Date.LocalDateTime.ToString("dd/MM HH:mm");
}

public sealed record PhoneContact(string Name, string Number)
{
    public string Initials
    {
        get
        {
            var words = Name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return string.Concat(words.Take(2).Select(word => char.ToUpperInvariant(word[0])));
        }
    }
}

public sealed record PhoneAudioDevice(
    string Id,
    string Name,
    bool CanRecord,
    bool CanPlay,
    bool IsUsb);

public enum AudioRoute
{
    Microphone,
    CallOutput,
    Ringer
}
