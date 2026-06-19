# A2 WhatsApp Webhook para WHMCS

Addon para enviar mensagens WhatsApp via webhook Digisac, respeitando um campo personalizado do cliente.

## O que ele faz

- Cadastra mensagens por evento no admin do WHMCS.
- Envia mensagem via webhook quando o evento ocorrer.
- So envia se o campo personalizado do cliente estiver com o valor permitido, por padrao `SIM`.
- Envia payload com `openTicket: false` e `closeTicket: false` no modo Digisac, para nao abrir nem fechar chamado.
- Registra logs dos ultimos envios.

## Estrutura

```text
public/addon/a2_whatsapp_webhook/
├── modules/addons/a2_whatsapp_webhook/
│   ├── a2_whatsapp_webhook.php
│   ├── hooks.php
│   ├── index.php
│   └── whmcs.json
└── README-INSTALACAO.md
```

## Instalacao

Suba a pasta:

```text
modules/addons/a2_whatsapp_webhook
```

Para:

```text
/modules/addons/a2_whatsapp_webhook
```

Depois ative no WHMCS:

```text
Setup > Addon Modules
```

Ou no caminho equivalente da sua versao.

## Configuracao

No addon, configure:

- `Ativo`: liga/desliga os envios automaticos.
- `URL do Webhook`: endpoint completo da Digisac ou do seu middleware. Para Digisac: `https://suaempresa.digisac.io/api/v1/messages`.
- `Token/Bearer`: opcional. Enviado como `Authorization: Bearer TOKEN`.
- `Campo personalizado opt-in`: selecione na lista o campo personalizado do cadastro do cliente.
- `Valor permitido`: normalmente `SIM`.
- `DDI padrao`: normalmente `55`.
- `Formato do payload`: `digisac` ou `generic`.
- `Digisac Service ID`: ID da conexao/canal na Digisac usado para enviar por numero.
- `Digisac Origin`: normalmente `bot`.
- `Templates de fatura criada`: nomes dos templates de e-mail que disparam o WhatsApp de fatura criada. Padrao: `Invoice Created,Fatura Criada`.
- `Templates de lembrete de fatura`: nomes dos templates de e-mail que disparam o WhatsApp de lembrete/cobranca.

## Campo personalizado do cliente

Crie ou use um campo personalizado do tipo cliente no WHMCS, por exemplo:

```text
Receber WhatsApp
```

O cliente so recebera mensagens se o valor desse campo for:

```text
SIM
```

O campo e o valor podem ser alterados na configuracao do addon.

## Eventos criados

- `client_add`: novo cliente.
- `invoice_created`: fatura criada.
- `invoice_paid`: fatura paga.
- `invoice_reminder`: lembrete de fatura.
- `service_created`: novo servico.
- `service_suspended`: servico suspenso.
- `service_reactivated`: servico reativado.
- `ticket_open`: chamado aberto.
- `ticket_admin_reply`: resposta de admin no chamado.

Todos nascem inativos. Ative apenas os que voce quiser usar.

## Variaveis nas mensagens

```text
{{client_name}}
{{firstname}}
{{lastname}}
{{company}}
{{email}}
{{invoice_id}}
{{invoice_num}}
{{invoice_total}}
{{invoice_due_date}}
{{invoice_url}}
{{boleto_link}}
{{cartao_link}}
{{pix_link}}
{{service_id}}
{{service_name}}
{{service_domain}}
{{service_status}}
{{ticket_id}}
{{ticket_subject}}
```

## Payload modo Digisac

```json
{
  "text": "Mensagem renderizada",
  "number": "5517999999999",
  "serviceId": "ID_DA_CONEXAO_DIGISAC",
  "origin": "bot",
  "dontOpenTicket": true,
  "dontOpenticket": true
}
```

O endpoint documentado pela Digisac para mensagens e `POST /api/v1/messages`.

## Links do Asaas

Para fatura criada, o addon usa o hook `EmailPreSend`, porque nesse momento o WHMCS ja processou as variaveis do template de e-mail do Asaas.

Ele procura estas variaveis:

```text
{$cobrancaasaasmpay_exibe_button_boleto}
{$cobrancaasaasmpay_exibe_button_cartao}
{$cobrancaasaasmpay_exibe_button_pix}
```

O addon extrai automaticamente o primeiro link encontrado dentro do HTML do botao e libera nas variaveis:

```text
{{boleto_link}}
{{cartao_link}}
{{pix_link}}
```

Exemplo de mensagem:

```text
Ola {{firstname}}, sua fatura #{{invoice_num}} no valor de {{invoice_total}} foi gerada.
Vencimento: {{invoice_due_date}}

Boleto: {{boleto_link}}
Cartao: {{cartao_link}}
Pix: {{pix_link}}
```

Importante: o WhatsApp de fatura criada e lembrete de fatura dispara quando o WHMCS prepara um template listado em `Templates de fatura criada` ou `Templates de lembrete de fatura`.

## Compatibilidade

- PHP 7.4 ou superior.
- WHMCS carregando normalmente.
- cURL habilitado no PHP.
- ionCube Loader ativo para o WHMCS.

## Teste

1. Configure a URL do webhook.
2. Cadastre `SIM` no campo personalizado do cliente de teste.
3. Ative uma mensagem.
4. Use o teste manual informando o ID do cliente.
5. Confira os logs no proprio addon.
