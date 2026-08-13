using PhoneWindows.Models;
using Windows.ApplicationModel.Contacts;

namespace PhoneWindows.Services;

public sealed class WindowsContactService
{
    private IReadOnlyList<PhoneContact>? _cache;

    public async Task<IReadOnlyList<PhoneContact>> LoadAsync(bool force = false)
    {
        if (!force && _cache is not null) return _cache;

        try
        {
            var store = await ContactManager.RequestStoreAsync(ContactStoreAccessType.AllContactsReadOnly);
            var contacts = await store.FindContactsAsync();
            _cache = contacts
                .SelectMany(contact => contact.Phones.Select(phone => new PhoneContact(
                    string.IsNullOrWhiteSpace(contact.DisplayName) ? phone.Number : contact.DisplayName,
                    phone.Number)))
                .Where(contact => !string.IsNullOrWhiteSpace(contact.Number))
                .OrderBy(contact => contact.Name, StringComparer.CurrentCultureIgnoreCase)
                .ToList();
        }
        catch
        {
            _cache = [];
        }

        return _cache;
    }

    public static IEnumerable<PhoneContact> Filter(IEnumerable<PhoneContact> contacts, string query)
    {
        if (string.IsNullOrWhiteSpace(query)) return contacts;
        var normalized = Normalize(query);
        return contacts.Where(contact =>
            Normalize(contact.Name).Contains(normalized, StringComparison.OrdinalIgnoreCase) ||
            Digits(contact.Number).Contains(Digits(query), StringComparison.OrdinalIgnoreCase));
    }

    private static string Digits(string value) => string.Concat(value.Where(char.IsDigit));

    private static string Normalize(string value)
    {
        var decomposed = value.Normalize(System.Text.NormalizationForm.FormD);
        return string.Concat(decomposed.Where(character =>
            System.Globalization.CharUnicodeInfo.GetUnicodeCategory(character) !=
            System.Globalization.UnicodeCategory.NonSpacingMark));
    }
}
