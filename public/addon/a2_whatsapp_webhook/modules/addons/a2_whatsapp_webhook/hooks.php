<?php

use WHMCS\Database\Capsule;

if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}

defined('A2_WA_TEMPLATES_TABLE') || define('A2_WA_TEMPLATES_TABLE', 'mod_a2_whatsapp_templates');
defined('A2_WA_LOGS_TABLE') || define('A2_WA_LOGS_TABLE', 'mod_a2_whatsapp_logs');

add_hook('ClientAdd', 1, function ($vars) {
    a2_wa_send_event((int) ($vars['userid'] ?? $vars['client_id'] ?? 0), 'client_add', $vars);
});

add_hook('InvoiceCreation', 1, function ($vars) {
    // Fatura criada e enviada via WhatsApp no EmailPreSend, pois nesse ponto
    // o WHMCS ja montou os links do gateway Asaas nos merge fields do e-mail.
});

add_hook('InvoicePaid', 1, function ($vars) {
    $invoiceId = (int) ($vars['invoiceid'] ?? 0);
    $invoice = $invoiceId ? Capsule::table('tblinvoices')->where('id', $invoiceId)->first() : null;
    if ($invoice) {
        a2_wa_send_event((int) $invoice->userid, 'invoice_paid', array_merge($vars, ['invoice' => $invoice]));
    }
});

add_hook('EmailPreSend', 1, function ($vars) {
    $config = a2_wa_config();
    $invoiceTemplates = a2_wa_csv_list((string) ($config['invoice_email_templates'] ?? 'Invoice Created,Fatura Criada'));
    $reminderTemplates = a2_wa_csv_list((string) ($config['invoice_reminder_email_templates'] ?? 'Invoice Payment Reminder,First Invoice Overdue Notice,Second Invoice Overdue Notice,Third Invoice Overdue Notice,Lembrete de Pagamento,Fatura Vencida'));
    $messageName = (string) ($vars['messagename'] ?? '');
    $event = '';

    if (in_array($messageName, $invoiceTemplates, true)) {
        $event = 'invoice_created';
    } elseif (in_array($messageName, $reminderTemplates, true)) {
        $event = 'invoice_reminder';
    }

    if ($event === '') {
        return [];
    }

    $invoiceId = (int) ($vars['relid'] ?? ($vars['mergefields']['invoice_id'] ?? 0));
    $invoice = $invoiceId ? Capsule::table('tblinvoices')->where('id', $invoiceId)->first() : null;
    if ($invoice) {
        a2_wa_send_event((int) $invoice->userid, $event, [
            'invoice' => $invoice,
            'mergefields' => $vars['mergefields'] ?? [],
            'email_template' => $messageName,
        ]);
    }

    return [];
});

add_hook('AfterModuleCreate', 1, function ($vars) {
    $service = a2_wa_service_from_hook($vars);
    if ($service) {
        a2_wa_send_event((int) $service->userid, 'service_created', array_merge($vars, ['service' => $service]));
    }
});

add_hook('AfterModuleUnsuspend', 1, function ($vars) {
    $service = a2_wa_service_from_hook($vars);
    if ($service) {
        a2_wa_send_event((int) $service->userid, 'service_reactivated', array_merge($vars, ['service' => $service]));
    }
});

add_hook('AfterModuleSuspend', 1, function ($vars) {
    $service = a2_wa_service_from_hook($vars);
    if ($service) {
        a2_wa_send_event((int) $service->userid, 'service_suspended', array_merge($vars, ['service' => $service]));
    }
});

add_hook('TicketOpen', 1, function ($vars) {
    $ticketId = (int) ($vars['ticketid'] ?? 0);
    $ticket = $ticketId ? Capsule::table('tbltickets')->where('id', $ticketId)->first() : null;
    if ($ticket) {
        a2_wa_send_event((int) $ticket->userid, 'ticket_open', array_merge($vars, ['ticket' => $ticket]));
    }
});

add_hook('TicketAdminReply', 1, function ($vars) {
    $ticketId = (int) ($vars['ticketid'] ?? 0);
    $ticket = $ticketId ? Capsule::table('tbltickets')->where('id', $ticketId)->first() : null;
    if ($ticket) {
        a2_wa_send_event((int) $ticket->userid, 'ticket_admin_reply', array_merge($vars, ['ticket' => $ticket]));
    }
});

function a2_wa_send_event(int $clientId, string $event, array $context = [], bool $manual = false): array
{
    a2_wa_ensure_runtime_tables();
    $config = a2_wa_config();

    if (!$manual && empty($config['enabled'])) {
        return ['sent' => false, 'message' => 'Envio automatico desativado.'];
    }
    if ($clientId <= 0) {
        return ['sent' => false, 'message' => 'Cliente invalido.'];
    }
    if (empty($config['webhook_url'])) {
        a2_wa_log($clientId, $event, '', 'skipped', '', 'Webhook URL nao configurada.');
        return ['sent' => false, 'message' => 'Webhook URL nao configurada.'];
    }

    $template = Capsule::table(A2_WA_TEMPLATES_TABLE)->where('event', $event)->first();
    if (!$template || (!$manual && !(int) $template->enabled)) {
        return ['sent' => false, 'message' => 'Mensagem inativa para este evento.'];
    }

    $client = Capsule::table('tblclients')->where('id', $clientId)->first();
    if (!$client) {
        return ['sent' => false, 'message' => 'Cliente nao encontrado.'];
    }

    if (!a2_wa_client_allowed($clientId, $config)) {
        a2_wa_log($clientId, $event, '', 'skipped', (string) $template->message, 'Campo personalizado nao autorizado.');
        return ['sent' => false, 'message' => 'Cliente sem opt-in WhatsApp.'];
    }

    $phone = a2_wa_client_phone($client, $config);
    if ($phone === '') {
        a2_wa_log($clientId, $event, '', 'error', (string) $template->message, 'Cliente sem telefone valido.');
        return ['sent' => false, 'message' => 'Cliente sem telefone valido.'];
    }

    $message = a2_wa_render_message((string) $template->message, $client, $context);
    $payload = a2_wa_payload($config, $client, $event, $phone, $message, $context);
    $response = a2_wa_post($config, $payload);

    a2_wa_log($clientId, $event, $phone, $response['ok'] ? 'sent' : 'error', $message, $response['body']);

    return [
        'sent' => $response['ok'],
        'message' => $response['ok'] ? 'Mensagem enviada.' : 'Falha no envio: ' . $response['body'],
    ];
}

function a2_wa_config(): array
{
    $rows = Capsule::table('tbladdonmodules')->where('module', 'a2_whatsapp_webhook')->get();
    $config = [];
    foreach ($rows as $row) {
        $config[$row->setting] = $row->value;
    }
    $config['custom_field_id'] = $config['custom_field_id'] ?? '';
    $config['custom_field_name'] = $config['custom_field_name'] ?? 'Receber Mensagem Whatsapp';
    $config['custom_field_yes_value'] = $config['custom_field_yes_value'] ?? 'Sim';
    $config['default_country_code'] = $config['default_country_code'] ?? '55';
    $config['payload_mode'] = $config['payload_mode'] ?? 'digisac';
    $config['digisac_service_id'] = $config['digisac_service_id'] ?? '';
    $config['digisac_origin'] = $config['digisac_origin'] ?? 'bot';
    $config['invoice_email_templates'] = $config['invoice_email_templates'] ?? 'Invoice Created,Fatura Criada';
    $config['invoice_reminder_email_templates'] = $config['invoice_reminder_email_templates'] ?? 'Invoice Payment Reminder,First Invoice Overdue Notice,Second Invoice Overdue Notice,Third Invoice Overdue Notice,Lembrete de Pagamento,Fatura Vencida';
    return $config;
}

function a2_wa_csv_list(string $value): array
{
    return array_filter(array_map('trim', explode(',', $value)), function ($item) {
        return $item !== '';
    });
}

function a2_wa_client_allowed(int $clientId, array $config): bool
{
    $fieldName = trim((string) ($config['custom_field_name'] ?? 'Receber Mensagem Whatsapp'));
    $yesValue = a2_wa_normalize_option((string) ($config['custom_field_yes_value'] ?? 'Sim'));
    $fieldId = a2_wa_configured_custom_field_id((string) ($config['custom_field_id'] ?? ''));

    if ($fieldId <= 0 && $fieldName !== '') {
        $field = Capsule::table('tblcustomfields')
            ->where('type', 'client')
            ->where('fieldname', 'like', $fieldName . '%')
            ->first();

        $fieldId = $field ? (int) $field->id : 0;
    }

    if ($fieldId <= 0) {
        return false;
    }

    $value = Capsule::table('tblcustomfieldsvalues')
        ->where('fieldid', $fieldId)
        ->where('relid', $clientId)
        ->value('value');

    $normalizedValue = a2_wa_normalize_option((string) $value);
    if ($normalizedValue === $yesValue) {
        return true;
    }

    return in_array($normalizedValue, ['sim', 's', 'yes', 'y', '1', 'true'], true);
}

function a2_wa_configured_custom_field_id(string $value): int
{
    if (preg_match('/^\s*(\d+)/', $value, $match)) {
        return (int) $match[1];
    }

    return 0;
}

function a2_wa_normalize_option(string $value): string
{
    $value = trim(strip_tags(html_entity_decode($value, ENT_QUOTES, 'UTF-8')));
    $value = str_replace(["\xc2\xa0", "\n", "\r", "\t"], ' ', $value);
    $value = preg_replace('/\s+/', ' ', $value);
    $normalized = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if ($normalized !== false) {
        $value = $normalized;
    }
    return strtolower(trim($value));
}

function a2_wa_client_phone(object $client, array $config): string
{
    $raw = (string) ($client->phonenumber ?? '');
    $digits = preg_replace('/\D+/', '', $raw);
    if ($digits === '') {
        return '';
    }

    $country = preg_replace('/\D+/', '', (string) ($config['default_country_code'] ?? '55'));
    if ($country && strlen($digits) <= 11) {
        $digits = $country . $digits;
    }

    return $digits;
}

function a2_wa_service_from_hook(array $vars): ?object
{
    $serviceId = (int) (
        $vars['serviceid'] ??
        $vars['params']['serviceid'] ??
        $vars['params']['accountid'] ??
        $vars['params']['id'] ??
        0
    );

    if ($serviceId <= 0) {
        return null;
    }

    return Capsule::table('tblhosting')
        ->leftJoin('tblproducts', 'tblproducts.id', '=', 'tblhosting.packageid')
        ->where('tblhosting.id', $serviceId)
        ->select(
            'tblhosting.*',
            'tblproducts.name as product_name'
        )
        ->first();
}

function a2_wa_render_message(string $message, object $client, array $context): string
{
    $invoice = $context['invoice'] ?? null;
    $service = $context['service'] ?? null;
    $ticket = $context['ticket'] ?? null;
    $mergefields = $context['mergefields'] ?? [];
    $clientName = trim((string) ($client->companyname ?: trim(($client->firstname ?? '') . ' ' . ($client->lastname ?? ''))));
    $signature = a2_wa_system_signature();

    $replace = [
        '{{client_name}}' => $clientName,
        '{{firstname}}' => (string) ($client->firstname ?? ''),
        '{{lastname}}' => (string) ($client->lastname ?? ''),
        '{{company}}' => (string) ($client->companyname ?? ''),
        '{{email}}' => (string) ($client->email ?? ''),
        '{{invoice_id}}' => $invoice ? (string) $invoice->id : '',
        '{{invoice_num}}' => a2_wa_merge_value($mergefields, 'invoice_num', $invoice ? (string) $invoice->invoicenum : ''),
        '{{invoice_total}}' => a2_wa_merge_value($mergefields, 'invoice_total', $invoice ? (string) $invoice->total : ''),
        '{{invoice_due_date}}' => a2_wa_merge_value($mergefields, 'invoice_date_due', $invoice ? (string) $invoice->duedate : ''),
        '{{invoice_url}}' => a2_wa_merge_value($mergefields, 'invoice_link', $invoice ? a2_wa_invoice_url((int) $invoice->id) : ''),
        '{{boleto_link}}' => a2_wa_first_url(a2_wa_merge_value($mergefields, 'cobrancaasaasmpay_exibe_button_boleto', '')),
        '{{cartao_link}}' => a2_wa_first_url(a2_wa_merge_value($mergefields, 'cobrancaasaasmpay_exibe_button_cartao', '')),
        '{{pix_link}}' => a2_wa_first_url(a2_wa_merge_value($mergefields, 'cobrancaasaasmpay_exibe_button_pix', '')),
        '{{service_id}}' => $service ? (string) $service->id : '',
        '{{service_name}}' => $service ? (string) ($service->product_name ?? '') : '',
        '{{service_domain}}' => $service ? (string) ($service->domain ?? '') : '',
        '{{service_status}}' => $service ? (string) ($service->domainstatus ?? '') : '',
        '{{ticket_id}}' => $ticket ? (string) $ticket->tid : '',
        '{{ticket_subject}}' => $ticket ? (string) $ticket->title : '',
        '{{assinatura}}' => $signature,
        '{{signature}}' => $signature,
    ];

    return strtr($message, $replace);
}

function a2_wa_system_signature(): string
{
    $settings = [
        'EmailSignature',
        'Signature',
        'MailSignature',
        'GlobalEmailSignature',
        'SystemEmailSignature',
    ];

    foreach ($settings as $setting) {
        $value = Capsule::table('tblconfiguration')->where('setting', $setting)->value('value');
        $signature = trim(strip_tags(html_entity_decode((string) $value, ENT_QUOTES, 'UTF-8')));
        if ($signature !== '') {
            return $signature;
        }
    }

    return '';
}

function a2_wa_merge_value(array $mergefields, string $key, string $fallback = ''): string
{
    return isset($mergefields[$key]) ? (string) $mergefields[$key] : $fallback;
}

function a2_wa_first_url(string $value): string
{
    if (preg_match('/href=["\']([^"\']+)["\']/i', $value, $match)) {
        return html_entity_decode($match[1], ENT_QUOTES, 'UTF-8');
    }
    if (preg_match('/https?:\/\/[^\s"\'<>]+/i', $value, $match)) {
        return html_entity_decode($match[0], ENT_QUOTES, 'UTF-8');
    }
    return trim(strip_tags($value));
}

function a2_wa_invoice_url(int $invoiceId): string
{
    $systemUrl = Capsule::table('tblconfiguration')->where('setting', 'SystemURL')->value('value');
    return rtrim((string) $systemUrl, '/') . '/viewinvoice.php?id=' . $invoiceId;
}

function a2_wa_payload(array $config, object $client, string $event, string $phone, string $message, array $context): array
{
    if (($config['payload_mode'] ?? 'digisac') === 'generic') {
        return [
            'event' => $event,
            'phone' => $phone,
            'message' => $message,
            'client' => [
                'id' => (int) $client->id,
                'name' => trim((string) ($client->companyname ?: (($client->firstname ?? '') . ' ' . ($client->lastname ?? '')))),
                'email' => (string) $client->email,
            ],
            'metadata' => [
                'source' => 'whmcs',
                'manual' => !empty($context['manual']),
            ],
        ];
    }

    $payload = [
        'text' => $message,
        'number' => $phone,
        'serviceId' => trim((string) ($config['digisac_service_id'] ?? '')),
        'origin' => in_array(($config['digisac_origin'] ?? 'bot'), ['bot', 'user'], true) ? $config['digisac_origin'] : 'bot',
        'dontOpenTicket' => true,
        'dontOpenticket' => true,
    ];

    if ($payload['serviceId'] === '') {
        unset($payload['serviceId']);
    }

    return $payload;
}

function a2_wa_post(array $config, array $payload): array
{
    $headers = ['Content-Type: application/json'];
    if (!empty($config['api_token'])) {
        $headers[] = 'Authorization: Bearer ' . $config['api_token'];
    }

    $ch = curl_init((string) $config['webhook_url']);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 20,
    ]);

    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno) {
        return ['ok' => false, 'body' => $error];
    }

    return [
        'ok' => $status >= 200 && $status < 300,
        'body' => 'HTTP ' . $status . ' - ' . substr((string) $body, 0, 800),
    ];
}

function a2_wa_log(int $clientId, string $event, string $phone, string $status, string $message, string $response): void
{
    Capsule::table(A2_WA_LOGS_TABLE)->insert([
        'client_id' => $clientId,
        'event' => $event,
        'phone' => $phone,
        'status' => $status,
        'message' => $message,
        'response' => $response,
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s'),
    ]);
}

function a2_wa_ensure_runtime_tables(): void
{
    if (!Capsule::schema()->hasTable(A2_WA_TEMPLATES_TABLE) || !Capsule::schema()->hasTable(A2_WA_LOGS_TABLE)) {
        if (function_exists('a2_whatsapp_webhook_activate')) {
            a2_whatsapp_webhook_activate();
        }
    }
}
