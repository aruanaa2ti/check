#define MyAppName "Phone"
#define MyAppVersion "0.1.2"
#define MyAppPublisher "A2TI"
#define MyAppExeName "Phone.Windows.exe"

[Setup]
AppId={{31ABDB75-8994-4AB0-9541-D16D985CD82F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\A2TI\Phone
DefaultGroupName={#MyAppName}
OutputDir=..\artifacts\installer
OutputBaseFilename=Phone-Setup-{#MyAppVersion}-x86
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\{#MyAppExeName}
SetupIconFile=..\Assets\Phone.ico

[Files]
Source: "..\artifacts\publish\win-x86\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\Assets\Phone.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\Assets\Phone.ico"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na Área de Trabalho"; GroupDescription: "Atalhos:"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Abrir Phone"; Flags: nowait postinstall skipifsilent
