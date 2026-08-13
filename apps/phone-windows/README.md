# Phone para Windows

Versão nativa Windows do Phone A2, com o mesmo desenho compacto da versão macOS.

## Recursos implementados

- Discador compacto com teclado físico e teclado numérico
- Backspace/Delete para apagar o último dígito
- Registro SIP ativável/desativável
- Configuração manual ou pelo endereço contido no QR Code
- Motor SIP Liblinphone 5.3.19 para Windows x86 (compatível com Windows x64)
- Chamadas recebidas, efetuadas, atendimento, encerramento e transferência
- Histórico persistente com exclusão individual
- Busca nos Contatos do Windows somente ao abrir a tela Contatos
- Seleção separada de microfone, áudio da ligação e campainha
- Preferência automática por telefone USB para fala e alto-falantes do PC para toque
- Notificação de chamada recebida
- Inicialização automática com o Windows
- Senha SIP armazenada no Cofre de Credenciais do Windows

## Requisitos para compilar

- Windows 10 1809 ou mais recente, preferencialmente Windows 11
- Visual Studio 2026 com **WinUI application development**
- .NET 10 SDK
- PowerShell 7 ou Windows PowerShell 5.1
- Inno Setup 6, somente para gerar o instalador

## Primeira compilação

Abra o PowerShell nesta pasta e execute:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\build-windows.ps1 -Configuration Release
```

O aplicativo será criado em:

```text
artifacts\publish\win-x86\Phone.Windows.exe
```

Para gerar também o instalador:

```powershell
.\scripts\build-windows.ps1 -Configuration Release -Installer
```

O instalador ficará em `artifacts\installer\Phone-Setup-0.1.0-x86.exe`.

## SDK SIP

O script baixa automaticamente o SDK Desktop oficial Liblinphone 5.3.19 da
Belledonne Communications. O pacote inclui o wrapper C# e os binários nativos
de 32 bits, compatíveis também com Windows de 64 bits.

Liblinphone é distribuído sob GPLv3. Para distribuição que não seja compatível
com essa licença, é necessário contratar uma licença comercial da Belledonne
Communications.

## Observação sobre chamadas em segundo plano

O Phone recebe chamadas enquanto estiver aberto ou minimizado e o Windows
estiver acordado. Receber com o processo totalmente encerrado exige push WNS e
integração adicional no servidor PABX.
