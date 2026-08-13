using System.Text.Json;
using PhoneWindows.Models;
using Windows.Security.Credentials;

namespace PhoneWindows.Services;

public sealed class PhonePreferences
{
    public bool RegistrationEnabled { get; set; } = true;
    public bool StartWithWindows { get; set; } = true;
    public string MicrophoneId { get; set; } = "";
    public string CallOutputId { get; set; } = "";
    public string RingerId { get; set; } = "";
}

public sealed class SettingsStore
{
    private const string CredentialResource = "Phone A2 SIP";
    private readonly string _folder = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "A2TI", "Phone");

    private string AccountPath => Path.Combine(_folder, "account.json");
    private string PreferencesPath => Path.Combine(_folder, "preferences.json");

    public async Task<SipAccount?> LoadAccountAsync()
    {
        if (!File.Exists(AccountPath)) return null;
        var stored = JsonSerializer.Deserialize<StoredAccount>(await File.ReadAllTextAsync(AccountPath));
        if (stored is null) return null;

        var password = "";
        try
        {
            var credential = new PasswordVault().Retrieve(CredentialResource, stored.AuthUser);
            credential.RetrievePassword();
            password = credential.Password;
        }
        catch { }

        return new SipAccount(
            stored.Extension, stored.AuthUser, password, stored.Host, stored.Port,
            stored.Transport, stored.DisplayName, stored.RegisterExpires);
    }

    public async Task SaveAccountAsync(SipAccount account)
    {
        Directory.CreateDirectory(_folder);
        var stored = new StoredAccount(
            account.Extension, account.AuthUser, account.Host, account.Port,
            account.Transport, account.DisplayName, account.RegisterExpires);
        await File.WriteAllTextAsync(AccountPath, JsonSerializer.Serialize(stored, JsonOptions));

        var vault = new PasswordVault();
        try
        {
            foreach (var credential in vault.FindAllByResource(CredentialResource)) vault.Remove(credential);
        }
        catch { }
        vault.Add(new PasswordCredential(CredentialResource, account.AuthUser, account.Password));
    }

    public Task RemoveAccountAsync()
    {
        if (File.Exists(AccountPath)) File.Delete(AccountPath);
        try
        {
            var vault = new PasswordVault();
            foreach (var credential in vault.FindAllByResource(CredentialResource)) vault.Remove(credential);
        }
        catch { }
        return Task.CompletedTask;
    }

    public async Task<PhonePreferences> LoadPreferencesAsync()
    {
        if (!File.Exists(PreferencesPath)) return new PhonePreferences();
        return JsonSerializer.Deserialize<PhonePreferences>(await File.ReadAllTextAsync(PreferencesPath))
               ?? new PhonePreferences();
    }

    public async Task SavePreferencesAsync(PhonePreferences preferences)
    {
        Directory.CreateDirectory(_folder);
        await File.WriteAllTextAsync(PreferencesPath, JsonSerializer.Serialize(preferences, JsonOptions));
    }

    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    private sealed record StoredAccount(
        string Extension, string AuthUser, string Host, int Port,
        string Transport, string DisplayName, int RegisterExpires);
}
