using System.Runtime.InteropServices;

namespace PhoneWindows.Services;

/// <summary>
/// Ícone nativo da bandeja do Windows. Reutiliza a janela principal para
/// receber os cliques, sem adicionar Windows Forms ao aplicativo WinUI.
/// </summary>
internal sealed class TrayIconService : IDisposable
{
    private const uint CallbackMessage = 0x8001;
    private const uint NimAdd = 0x00000000;
    private const uint NimDelete = 0x00000002;
    private const uint NifMessage = 0x00000001;
    private const uint NifIcon = 0x00000002;
    private const uint NifTip = 0x00000004;
    private const uint WmLButtonUp = 0x0202;
    private const uint WmLButtonDoubleClick = 0x0203;
    private const uint WmRButtonUp = 0x0205;
    private const uint WmContextMenu = 0x007B;
    private const int GwlpWndProc = -4;
    private const uint ImageIcon = 1;
    private const uint LrLoadFromFile = 0x0010;
    private const uint LrDefaultSize = 0x0040;
    private const uint MfString = 0x0000;
    private const uint MfSeparator = 0x0800;
    private const uint TpmRightButton = 0x0002;
    private const uint TpmReturnCommand = 0x0100;

    private readonly nint _windowHandle;
    private readonly Action _openRequested;
    private readonly Action _exitRequested;
    private readonly WindowProc _windowProc;
    private readonly nint _previousWindowProc;
    private readonly nint _iconHandle;
    private NotifyIconData _iconData;
    private bool _disposed;

    internal TrayIconService(nint windowHandle, string iconPath, Action openRequested, Action exitRequested)
    {
        _windowHandle = windowHandle;
        _openRequested = openRequested;
        _exitRequested = exitRequested;
        _windowProc = HandleWindowMessage;
        _previousWindowProc = SetWindowProc(windowHandle, Marshal.GetFunctionPointerForDelegate(_windowProc));
        _iconHandle = LoadImage(nint.Zero, iconPath, ImageIcon, 0, 0, LrLoadFromFile | LrDefaultSize);

        _iconData = new NotifyIconData
        {
            Size = (uint)Marshal.SizeOf<NotifyIconData>(),
            WindowHandle = windowHandle,
            Id = 1,
            Flags = NifMessage | NifIcon | NifTip,
            CallbackMessage = CallbackMessage,
            IconHandle = _iconHandle,
            Tip = "Phone"
        };
        ShellNotifyIcon(NimAdd, ref _iconData);
    }

    private nint HandleWindowMessage(nint windowHandle, uint message, nint wParam, nint lParam)
    {
        if (message == CallbackMessage)
        {
            var mouseMessage = unchecked((uint)lParam.ToInt64());
            if (mouseMessage is WmLButtonUp or WmLButtonDoubleClick)
            {
                _openRequested();
                return nint.Zero;
            }

            if (mouseMessage is WmRButtonUp or WmContextMenu)
            {
                ShowContextMenu();
                return nint.Zero;
            }
        }

        return CallWindowProc(_previousWindowProc, windowHandle, message, wParam, lParam);
    }

    private void ShowContextMenu()
    {
        var menu = CreatePopupMenu();
        if (menu == nint.Zero) return;
        try
        {
            AppendMenu(menu, MfString, 1, "Abrir Phone");
            AppendMenu(menu, MfSeparator, 0, null);
            AppendMenu(menu, MfString, 2, "Sair");
            GetCursorPos(out var point);
            SetForegroundWindow(_windowHandle);
            var command = TrackPopupMenu(menu, TpmRightButton | TpmReturnCommand,
                point.X, point.Y, 0, _windowHandle, nint.Zero);
            if (command == 1) _openRequested();
            else if (command == 2) _exitRequested();
        }
        finally
        {
            DestroyMenu(menu);
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        ShellNotifyIcon(NimDelete, ref _iconData);
        if (_previousWindowProc != nint.Zero) SetWindowProc(_windowHandle, _previousWindowProc);
        if (_iconHandle != nint.Zero) DestroyIcon(_iconHandle);
        GC.KeepAlive(_windowProc);
    }

    private static nint SetWindowProc(nint windowHandle, nint value) => IntPtr.Size == 8
        ? SetWindowLongPtr64(windowHandle, GwlpWndProc, value)
        : new nint(SetWindowLong32(windowHandle, GwlpWndProc, value.ToInt32()));

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct NotifyIconData
    {
        public uint Size;
        public nint WindowHandle;
        public uint Id;
        public uint Flags;
        public uint CallbackMessage;
        public nint IconHandle;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string Tip;
        public uint State;
        public uint StateMask;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)] public string Info;
        public uint TimeoutOrVersion;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)] public string InfoTitle;
        public uint InfoFlags;
        public Guid ItemGuid;
        public nint BalloonIconHandle;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct Point { public int X; public int Y; }

    private delegate nint WindowProc(nint windowHandle, uint message, nint wParam, nint lParam);

    [DllImport("shell32.dll", CharSet = CharSet.Unicode, EntryPoint = "Shell_NotifyIconW")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool ShellNotifyIcon(uint message, ref NotifyIconData data);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "LoadImageW")]
    private static extern nint LoadImage(nint instance, string name, uint type, int width, int height, uint flags);

    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW")]
    private static extern nint SetWindowLongPtr64(nint windowHandle, int index, nint value);

    [DllImport("user32.dll", EntryPoint = "SetWindowLongW")]
    private static extern int SetWindowLong32(nint windowHandle, int index, int value);

    [DllImport("user32.dll", EntryPoint = "CallWindowProcW")]
    private static extern nint CallWindowProc(nint previous, nint windowHandle, uint message, nint wParam, nint lParam);

    [DllImport("user32.dll")]
    private static extern nint CreatePopupMenu();

    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "AppendMenuW")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool AppendMenu(nint menu, uint flags, uint id, string? text);

    [DllImport("user32.dll")]
    private static extern uint TrackPopupMenu(nint menu, uint flags, int x, int y, int reserved, nint window, nint rectangle);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool DestroyMenu(nint menu);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetCursorPos(out Point point);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetForegroundWindow(nint windowHandle);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool DestroyIcon(nint iconHandle);
}
