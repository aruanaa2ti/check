param(
    [ValidateSet("Debug", "Release")]
    [string]$Configuration = "Release",
    [switch]$Installer
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$publishRoot = Join-Path $projectRoot "artifacts\publish\win-x86"
$installerRoot = Join-Path $projectRoot "artifacts\installer"
$linphoneRoot = Join-Path $projectRoot "vendor\linphone-sdk"
$linphoneWrapper = Join-Path $linphoneRoot "win32\share\linphonecs\LinphoneWrapper.cs"
$icon = Join-Path $projectRoot "Assets\Phone.ico"

if (-not (Test-Path $icon)) {
    throw "Ícone do Phone não encontrado em $icon"
}

if (-not (Test-Path $linphoneWrapper)) {
    $sdkUrl = "https://download.linphone.org/releases/windows/sdk/linphone-sdk-Desktop-5.3.19.zip"
    $bundledArchive = Join-Path $projectRoot "vendor\linphone-sdk-Desktop-5.3.19.zip"
    $sdkArchive = if (Test-Path $bundledArchive) { $bundledArchive } else { Join-Path $env:TEMP "linphone-sdk-Desktop-5.3.19.zip" }
    $sdkExtract = Join-Path $env:TEMP "phone-linphone-sdk-5.3.19"
    if (-not (Test-Path $bundledArchive)) {
        Write-Host "Baixando o motor SIP Linphone 5.3.19 do servidor oficial..."
        Invoke-WebRequest -Uri $sdkUrl -OutFile $sdkArchive
    }
    if (Test-Path $sdkExtract) { Remove-Item $sdkExtract -Recurse -Force }
    Expand-Archive -Path $sdkArchive -DestinationPath $sdkExtract -Force
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $linphoneRoot) | Out-Null
    Move-Item (Join-Path $sdkExtract "linphone-sdk") $linphoneRoot -Force
}

Push-Location $projectRoot
try {
    dotnet restore .\Phone.Windows.csproj
    dotnet publish .\Phone.Windows.csproj `
        -c $Configuration `
        -r win-x86 `
        --self-contained true `
        -p:Platform=x86 `
        -o $publishRoot

    $requiredFiles = @(
        (Join-Path $publishRoot "Phone.Windows.exe"),
        (Join-Path $publishRoot "liblinphone.dll"),
        (Join-Path $publishRoot "Assets\Phone.ico")
    )
    foreach ($requiredFile in $requiredFiles) {
        if (-not (Test-Path $requiredFile)) { throw "Arquivo obrigatório ausente: $requiredFile" }
    }

    Write-Host "Phone gerado em: $publishRoot\Phone.Windows.exe"

    if ($Installer) {
        $isccCandidates = @(
            "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
            "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
        )
        $iscc = $isccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
        if (-not $iscc) {
            throw "Inno Setup 6 não encontrado. Instale-o e execute novamente com -Installer."
        }
        New-Item -ItemType Directory -Force -Path $installerRoot | Out-Null
        & $iscc ".\installer\Phone.iss"
        Write-Host "Instalador gerado em: $installerRoot"
    }
}
finally {
    Pop-Location
}
