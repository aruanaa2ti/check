using System.Text.Json;
using PhoneWindows.Models;

namespace PhoneWindows.Services;

public sealed class HistoryStore
{
    private readonly string _path = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "A2TI", "Phone", "history.json");

    public async Task<IReadOnlyList<CallHistoryItem>> LoadAsync()
    {
        if (!File.Exists(_path)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<CallHistoryItem>>(await File.ReadAllTextAsync(_path)) ?? [];
        }
        catch { return []; }
    }

    public async Task SaveAsync(IEnumerable<CallHistoryItem> items)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        await File.WriteAllTextAsync(_path, JsonSerializer.Serialize(items.Take(200), new JsonSerializerOptions
        {
            WriteIndented = true
        }));
    }
}
