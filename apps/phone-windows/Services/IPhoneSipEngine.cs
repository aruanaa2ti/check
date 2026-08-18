using PhoneWindows.Models;

namespace PhoneWindows.Services;

public interface IPhoneSipEngine : IDisposable
{
    event Action<RegistrationState, string?>? RegistrationChanged;
    event Action<PhoneCallState, string?>? CallChanged;
    event Action? AudioDevicesChanged;
    event Action<bool>? AttendedTransferChanged;

    Task StartAsync(SipAccount account);
    Task CallAsync(string number);
    void SendDtmf(char digit);
    void Answer();
    Task TransferAsync(string number);
    void CompleteAttendedTransfer();
    void EndCall();
    IReadOnlyList<PhoneAudioDevice> GetAudioDevices();
    void SelectAudioDevice(string id, AudioRoute route);
    bool SetSpeakerEnabled(bool enabled);
    void Stop();
}

public static class PhoneSipEngineFactory
{
    public static IPhoneSipEngine Create()
    {
#if LINPHONE_SDK
        return new LinphoneSipEngine();
#else
        return new MissingLinphoneSipEngine();
#endif
    }
}

internal sealed class MissingLinphoneSipEngine : IPhoneSipEngine
{
    public event Action<RegistrationState, string?>? RegistrationChanged;
    public event Action<PhoneCallState, string?>? CallChanged;
    public event Action? AudioDevicesChanged;
    public event Action<bool>? AttendedTransferChanged;

    public Task StartAsync(SipAccount account)
    {
        const string message = "SDK Linphone não foi restaurado. Verifique o registro NuGet configurado no projeto.";
        RegistrationChanged?.Invoke(RegistrationState.Failed, message);
        throw new InvalidOperationException(message);
    }

    public Task CallAsync(string number) => Task.FromException(new InvalidOperationException("Motor SIP indisponível."));
    public void SendDtmf(char digit) => throw new InvalidOperationException("Motor SIP indisponível.");
    public void Answer() => throw new InvalidOperationException("Motor SIP indisponível.");
    public Task TransferAsync(string number) => Task.FromException(new InvalidOperationException("Motor SIP indisponível."));
    public void CompleteAttendedTransfer() => throw new InvalidOperationException("Motor SIP indisponível.");
    public void EndCall() => CallChanged?.Invoke(PhoneCallState.Idle, null);
    public IReadOnlyList<PhoneAudioDevice> GetAudioDevices() => [];
    public void SelectAudioDevice(string id, AudioRoute route) { }
    public bool SetSpeakerEnabled(bool enabled) => false;
    public void Stop() => RegistrationChanged?.Invoke(RegistrationState.NotConfigured, null);
    public void Dispose() => Stop();
}
