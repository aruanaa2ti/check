using System.Text.Json;
using System.Text.Json.Serialization;
using PhoneWindows.Models;

namespace PhoneWindows.Services;

public static class ProvisioningClient
{
    private static readonly HttpClient Client = new();

    public static async Task<SipAccount> ProvisionAsync(string rawValue)
    {
        var normalized = Normalize(rawValue);
        if (!Uri.TryCreate(normalized, UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps ||
            (uri.AbsolutePath != "/api/pabx-phone" && uri.AbsolutePath != "/api/pabx-linphone") ||
            !uri.Query.Contains("token=", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Este QR Code não pertence ao Phone.");

        var requestUri = uri.AbsolutePath == "/api/pabx-linphone"
            ? new UriBuilder(uri) { Path = "/api/pabx-phone" }.Uri
            : uri;
        using var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
        request.Headers.Accept.ParseAdd("application/json");
        using var response = await Client.SendAsync(request);
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException("Não foi possível configurar o ramal.");

        var payload = JsonSerializer.Deserialize<ProvisioningPayload>(await response.Content.ReadAsStringAsync(), JsonOptions)
                      ?? throw new InvalidOperationException("Resposta de configuração inválida.");
        if (!payload.Ok || payload.Version != 1 || payload.Account is null ||
            string.IsNullOrWhiteSpace(payload.Account.Extension) ||
            string.IsNullOrWhiteSpace(payload.Account.Password) ||
            string.IsNullOrWhiteSpace(payload.Account.Host))
            throw new InvalidOperationException("Resposta de configuração inválida.");
        return payload.Account;
    }

    private static string Normalize(string value)
    {
        var result = value.Trim();
        if (result.StartsWith("linphone-config:", StringComparison.OrdinalIgnoreCase))
        {
            result = result["linphone-config:".Length..].TrimStart('/');
            result = Uri.UnescapeDataString(result);
        }
        return result;
    }

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private sealed record ProvisioningPayload(bool Ok, int Version, SipAccount? Account);
}
