using System.Collections.ObjectModel;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using PhoneWindows.Models;
using PhoneWindows.Services;

namespace PhoneWindows.Controls;

public sealed partial class ContactsPanel : UserControl
{
    private readonly WindowsContactService _service = new();
    private IReadOnlyList<PhoneContact> _allContacts = [];
    private readonly ObservableCollection<PhoneContact> _visibleContacts = [];

    public event Action<string>? NumberSelected;

    public ContactsPanel()
    {
        InitializeComponent();
        ContactsList.ItemsSource = _visibleContacts;
        Loaded += async (_, _) =>
        {
            _allContacts = await _service.LoadAsync();
            Refresh();
            SearchBox.Focus(FocusState.Programmatic);
        };
    }

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e) => Refresh();

    private void Refresh()
    {
        _visibleContacts.Clear();
        foreach (var contact in WindowsContactService.Filter(_allContacts, SearchBox.Text)) _visibleContacts.Add(contact);
        EmptyText.Visibility = _visibleContacts.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
    }

    private void ContactsList_ItemClick(object sender, ItemClickEventArgs e)
    {
        if (e.ClickedItem is PhoneContact contact) NumberSelected?.Invoke(contact.Number);
    }
}
