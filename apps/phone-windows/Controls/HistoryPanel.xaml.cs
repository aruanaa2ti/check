using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using PhoneWindows.Models;
using PhoneWindows.ViewModels;

namespace PhoneWindows.Controls;

public sealed partial class HistoryPanel : UserControl
{
    private readonly PhoneViewModel _viewModel;
    public event Action<string>? NumberSelected;

    public HistoryPanel(PhoneViewModel viewModel)
    {
        _viewModel = viewModel;
        InitializeComponent();
        HistoryList.ItemsSource = viewModel.History;
        RefreshEmptyState();
    }

    private void HistoryList_ItemClick(object sender, ItemClickEventArgs e)
    {
        if (e.ClickedItem is CallHistoryItem item) NumberSelected?.Invoke(item.Number);
    }

    private async void Delete_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button { Tag: Guid id }) await _viewModel.DeleteHistoryItemAsync(id);
        RefreshEmptyState();
    }

    private async void Clear_Click(object sender, RoutedEventArgs e)
    {
        await _viewModel.ClearHistoryAsync();
        RefreshEmptyState();
    }

    private void RefreshEmptyState() => EmptyText.Visibility = _viewModel.History.Count == 0
        ? Visibility.Visible : Visibility.Collapsed;
}
