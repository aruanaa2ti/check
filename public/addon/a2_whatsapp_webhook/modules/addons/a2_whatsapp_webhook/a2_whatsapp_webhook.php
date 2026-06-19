<?php

use WHMCS\Database\Capsule;

if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}

defined('A2_WA_TEMPLATES_TABLE') || define('A2_WA_TEMPLATES_TABLE', 'mod_a2_whatsapp_templates');
defined('A2_WA_LOGS_TABLE') || define('A2_WA_LOGS_TABLE', 'mod_a2_whatsapp_logs');

function a2_whatsapp_webhook_config()
{
    return [
        'name' => 'A2 WhatsApp Webhook',
        'description' => 'Envia mensagens para clientes via webhook Digisac, validando opt-in em campo personalizado do cadastro.',
        'version' => '1.0.0',
        'author' => 'a2 Solucoes em T.I.',
        'fields' => [
            'enabled' => [
                'FriendlyName' => 'Ativo',
                'Type' => 'yesno',
                'Description' => 'Marque para permitir envios automaticos.',
            ],
            'webhook_url' => [
                'FriendlyName' => 'URL do Webhook',
                'Type' => 'text',
                'Size' => '90',
                'Description' => 'Use a rota completa. Para Digisac: https://suaempresa.digisac.io/api/v1/messages.',
            ],
            'api_token' => [
                'FriendlyName' => 'Token/Bearer',
                'Type' => 'password',
                'Size' => '80',
                'Description' => 'Opcional. Se preenchido, sera enviado como Authorization: Bearer TOKEN.',
            ],
            'custom_field_id' => [
                'FriendlyName' => 'Campo personalizado opt-in',
                'Type' => 'dropdown',
                'Options' => a2_wa_client_custom_field_options(),
                'Description' => 'Selecione o campo personalizado de cliente usado para autorizar WhatsApp.',
            ],
            'custom_field_yes_value' => [
                'FriendlyName' => 'Valor permitido',
                'Type' => 'text',
                'Size' => '20',
                'Default' => 'Sim',
                'Description' => 'So envia quando o campo tiver este valor.',
            ],
            'default_country_code' => [
                'FriendlyName' => 'DDI padrao',
                'Type' => 'text',
                'Size' => '8',
                'Default' => '55',
                'Description' => 'Usado quando o telefone do cliente nao vier com DDI.',
            ],
            'payload_mode' => [
                'FriendlyName' => 'Formato do payload',
                'Type' => 'dropdown',
                'Options' => 'digisac,generic',
                'Default' => 'digisac',
                'Description' => 'digisac envia text/number/serviceId/origin. generic envia client/event/message/metadata.',
            ],
            'digisac_service_id' => [
                'FriendlyName' => 'Digisac Service ID',
                'Type' => 'text',
                'Size' => '50',
                'Description' => 'ID da conexao/canal na Digisac usado para enviar por numero.',
            ],
            'digisac_origin' => [
                'FriendlyName' => 'Digisac Origin',
                'Type' => 'dropdown',
                'Options' => 'bot,user',
                'Default' => 'bot',
                'Description' => 'Origem enviada para a API da Digisac.',
            ],
            'invoice_email_templates' => [
                'FriendlyName' => 'Templates de fatura criada',
                'Type' => 'text',
                'Size' => '90',
                'Default' => 'Invoice Created,Fatura Criada',
                'Description' => 'Nomes dos templates de e-mail que disparam WhatsApp de fatura criada, separados por virgula.',
            ],
            'invoice_reminder_email_templates' => [
                'FriendlyName' => 'Templates de lembrete de fatura',
                'Type' => 'text',
                'Size' => '90',
                'Default' => 'Invoice Payment Reminder,First Invoice Overdue Notice,Second Invoice Overdue Notice,Third Invoice Overdue Notice,Lembrete de Pagamento,Fatura Vencida',
                'Description' => 'Nomes dos templates de e-mail que disparam WhatsApp de lembrete de fatura, separados por virgula.',
            ],
        ],
    ];
}

function a2_wa_client_custom_field_options(): string
{
    try {
        $fields = Capsule::table('tblcustomfields')
            ->where('type', 'client')
            ->orderBy('fieldname')
            ->get(['id', 'fieldname']);

        $options = ['0 - Selecione um campo'];
        foreach ($fields as $field) {
            $name = trim(strip_tags(html_entity_decode((string) $field->fieldname, ENT_QUOTES, 'UTF-8')));
            $name = str_replace(',', ' ', $name);
            if ($name !== '') {
                $options[] = (int) $field->id . ' - ' . $name;
            }
        }

        return implode(',', $options);
    } catch (Throwable $e) {
        return '0 - Nenhum campo encontrado';
    }
}

function a2_whatsapp_webhook_activate()
{
    try {
        if (!Capsule::schema()->hasTable(A2_WA_TEMPLATES_TABLE)) {
            Capsule::schema()->create(A2_WA_TEMPLATES_TABLE, function ($table) {
                $table->increments('id');
                $table->string('event', 64)->unique();
                $table->string('name', 120);
                $table->text('message');
                $table->boolean('enabled')->default(false);
                $table->timestamps();
            });
        }

        if (!Capsule::schema()->hasTable(A2_WA_LOGS_TABLE)) {
            Capsule::schema()->create(A2_WA_LOGS_TABLE, function ($table) {
                $table->increments('id');
                $table->integer('client_id')->default(0);
                $table->string('event', 64);
                $table->string('phone', 40)->default('');
                $table->string('status', 30);
                $table->text('message')->nullable();
                $table->text('response')->nullable();
                $table->timestamps();
            });
        }

        a2_wa_seed_templates();

        return ['status' => 'success', 'description' => 'Addon ativado. Configure URL, token e mensagens.'];
    } catch (Throwable $e) {
        return ['status' => 'error', 'description' => $e->getMessage()];
    }
}

function a2_whatsapp_webhook_deactivate()
{
    return ['status' => 'success', 'description' => 'Addon desativado. As tabelas foram preservadas.'];
}

function a2_whatsapp_webhook_output($vars)
{
    a2_wa_ensure_tables();
    a2_wa_seed_templates();
    if (!function_exists('a2_wa_send_event')) {
        require_once __DIR__ . '/hooks.php';
    }

    $notice = '';
    $error = '';

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['a2_action'])) {
        try {
            if ($_POST['a2_action'] === 'save_template') {
                a2_wa_save_template($_POST);
                $notice = 'Mensagem salva com sucesso.';
            }
            if ($_POST['a2_action'] === 'toggle_template') {
                a2_wa_toggle_template($_POST);
                $notice = 'Status da mensagem atualizado.';
            }
            if ($_POST['a2_action'] === 'test_send') {
                $clientId = (int) ($_POST['client_id'] ?? 0);
                $event = (string) ($_POST['event'] ?? '');
                $result = a2_wa_send_event($clientId, $event, ['manual' => true], true);
                $notice = $result['message'];
            }
        } catch (Throwable $e) {
            $error = $e->getMessage();
        }
    }

    $templates = Capsule::table(A2_WA_TEMPLATES_TABLE)->orderBy('name')->get();
    $logs = Capsule::table(A2_WA_LOGS_TABLE)->orderBy('id', 'desc')->limit(20)->get();

    echo '<style>
        .a2-wa-grid{display:grid;grid-template-columns:1fr;gap:18px}
        .a2-wa-card{background:#fff;border:1px solid #ddd;border-radius:6px;padding:18px}
        .a2-wa-card h3{margin-top:0}
        .a2-wa-row{display:grid;grid-template-columns:180px 1fr;gap:12px;align-items:center;margin-bottom:12px}
        .a2-wa-row textarea{min-height:110px}
        .a2-wa-table{width:100%;border-collapse:collapse}
        .a2-wa-table th,.a2-wa-table td{border:1px solid #e5e5e5;padding:12px;text-align:center;vertical-align:middle}
        .a2-wa-table th{background:#fafafa;font-weight:700}
        .a2-wa-table td.a2-wa-message{text-align:center;line-height:1.5;white-space:pre-wrap}
        .a2-wa-table td.a2-wa-left{text-align:left}
        .a2-wa-help{color:#666;font-size:12px;line-height:1.6}
        .a2-wa-badge{display:inline-block;border-radius:999px;padding:2px 8px;background:#eaf7ea;color:#147a13;font-size:12px;font-weight:bold}
        .a2-wa-toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}
        .a2-wa-search{max-width:320px}
        .a2-wa-status{display:inline-flex;align-items:center;justify-content:center;width:38px;height:34px;border-radius:4px;color:#fff;font-size:18px;font-weight:700}
        .a2-wa-status-on{background:#5cb85c}
        .a2-wa-status-off{background:#d9534f}
        .a2-wa-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
        .a2-wa-edit-row{display:none;background:#fbfbfb}
        .a2-wa-edit-row.is-open{display:table-row}
        .a2-wa-edit-box{display:grid;grid-template-columns:160px 1fr;gap:12px;align-items:center;text-align:left}
        .a2-wa-edit-box textarea{min-height:150px}
    </style>';

    echo '<div class="a2-wa-grid">';
    echo '<div class="a2-wa-card"><h2>A2 WhatsApp Webhook</h2>';
    echo '<p class="a2-wa-help">Configure os dados do addon em Setup &gt; Addon Modules. O envio automatico so ocorre quando o campo personalizado do cliente tiver o valor configurado, por padrao <strong>Sim</strong>.</p>';
    echo '<p class="a2-wa-help">Variaveis: <code>{{client_name}}</code>, <code>{{firstname}}</code>, <code>{{lastname}}</code>, <code>{{company}}</code>, <code>{{email}}</code>, <code>{{invoice_id}}</code>, <code>{{invoice_num}}</code>, <code>{{invoice_total}}</code>, <code>{{invoice_due_date}}</code>, <code>{{invoice_url}}</code>, <code>{{boleto_link}}</code>, <code>{{cartao_link}}</code>, <code>{{pix_link}}</code>, <code>{{service_id}}</code>, <code>{{service_name}}</code>, <code>{{service_domain}}</code>, <code>{{service_status}}</code>, <code>{{ticket_id}}</code>, <code>{{ticket_subject}}</code>, <code>{{assinatura}}</code>.</p>';
    if ($notice) {
        echo '<div class="alert alert-success">' . a2_wa_e($notice) . '</div>';
    }
    if ($error) {
        echo '<div class="alert alert-danger">' . a2_wa_e($error) . '</div>';
    }
    echo '</div>';

    echo '<div class="a2-wa-card">';
    echo '<div class="a2-wa-toolbar">';
    echo '<h3 style="margin:0">Templates de mensagens</h3>';
    echo '<input id="a2WaTemplateSearch" class="form-control a2-wa-search" type="search" placeholder="Pesquisar template">';
    echo '</div>';
    echo '<p class="a2-wa-help">Mostrando <strong>' . count($templates) . '</strong> templates em ordem alfabetica.</p>';
    echo '<table class="a2-wa-table" id="a2WaTemplatesTable"><thead><tr><th>ID</th><th>Tipo de<br>Mensagem</th><th>Mensagem</th><th>Status</th><th>Editar</th><th>Acoes</th></tr></thead><tbody>';
    foreach ($templates as $template) {
        $isEnabled = (int) $template->enabled === 1;
        $messagePreview = (string) $template->message;
        if (strlen($messagePreview) > 260) {
            $messagePreview = substr($messagePreview, 0, 257) . '...';
        }
        $searchText = strtolower((string) $template->id . ' ' . $template->name . ' ' . $template->event . ' ' . $template->message);

        echo '<tr class="a2-wa-template-row" data-search="' . a2_wa_e($searchText) . '">';
        echo '<td>' . (int) $template->id . '</td>';
        echo '<td>' . a2_wa_e($template->name) . '<br><small class="text-muted">' . a2_wa_e($template->event) . '</small></td>';
        echo '<td class="a2-wa-message">' . a2_wa_e($messagePreview) . '</td>';
        echo '<td><span class="a2-wa-status ' . ($isEnabled ? 'a2-wa-status-on' : 'a2-wa-status-off') . '">' . ($isEnabled ? '&#10003;' : '&times;') . '</span></td>';
        echo '<td><button type="button" class="btn btn-default a2-wa-edit-button" data-template-id="' . (int) $template->id . '">&#9998; Editar mensagem</button></td>';
        echo '<td><div class="a2-wa-actions">';
        echo '<form method="post"><input type="hidden" name="a2_action" value="toggle_template"><input type="hidden" name="id" value="' . (int) $template->id . '"><input type="hidden" name="enabled" value="0"><button class="btn btn-default" type="submit"' . (!$isEnabled ? ' disabled' : '') . '>&#128263; Desativar Envio</button></form>';
        echo '<form method="post"><input type="hidden" name="a2_action" value="toggle_template"><input type="hidden" name="id" value="' . (int) $template->id . '"><input type="hidden" name="enabled" value="1"><button class="btn btn-success" type="submit"' . ($isEnabled ? ' disabled' : '') . '>&#128276; Ativar Envio</button></form>';
        echo '</div></td>';
        echo '</tr>';

        echo '<tr class="a2-wa-edit-row" id="a2-wa-edit-' . (int) $template->id . '"><td colspan="6">';
        echo '<form method="post">';
        echo '<input type="hidden" name="a2_action" value="save_template">';
        echo '<input type="hidden" name="id" value="' . (int) $template->id . '">';
        echo '<div class="a2-wa-edit-box">';
        echo '<label>Nome</label><input class="form-control" name="name" value="' . a2_wa_e($template->name) . '">';
        echo '<label>Evento</label><input class="form-control" name="event" value="' . a2_wa_e($template->event) . '" readonly>';
        echo '<label>Ativa</label><label><input type="checkbox" name="enabled" value="1" ' . ($isEnabled ? 'checked' : '') . '> Enviar automaticamente</label>';
        echo '<label>Mensagem</label><textarea class="form-control" name="message">' . a2_wa_e($template->message) . '</textarea>';
        echo '<span></span><div><button class="btn btn-primary" type="submit">Salvar mensagem</button> <button class="btn btn-default a2-wa-close-edit" type="button" data-template-id="' . (int) $template->id . '">Cancelar</button></div>';
        echo '</div>';
        echo '</form>';
        echo '</td></tr>';
    }
    echo '</tbody></table>';
    echo '</div>';

    echo '<script>
    (function(){
        var search = document.getElementById("a2WaTemplateSearch");
        var rows = document.querySelectorAll(".a2-wa-template-row");
        function closeAll(){
            document.querySelectorAll(".a2-wa-edit-row").forEach(function(row){ row.classList.remove("is-open"); });
        }
        if (search) {
            search.addEventListener("input", function(){
                var term = search.value.toLowerCase();
                closeAll();
                rows.forEach(function(row){
                    var visible = row.getAttribute("data-search").indexOf(term) !== -1;
                    row.style.display = visible ? "" : "none";
                    var editRow = document.getElementById("a2-wa-edit-" + row.querySelector(".a2-wa-edit-button").getAttribute("data-template-id"));
                    if (editRow && !visible) editRow.classList.remove("is-open");
                });
            });
        }
        document.querySelectorAll(".a2-wa-edit-button").forEach(function(button){
            button.addEventListener("click", function(){
                var row = document.getElementById("a2-wa-edit-" + button.getAttribute("data-template-id"));
                var wasOpen = row && row.classList.contains("is-open");
                closeAll();
                if (row && !wasOpen) row.classList.add("is-open");
            });
        });
        document.querySelectorAll(".a2-wa-close-edit").forEach(function(button){
            button.addEventListener("click", function(){
                var row = document.getElementById("a2-wa-edit-" + button.getAttribute("data-template-id"));
                if (row) row.classList.remove("is-open");
            });
        });
    })();
    </script>';

    echo '<div class="a2-wa-card">';
    echo '<h3>Teste manual</h3>';
    echo '<form method="post" class="form-inline">';
    echo '<input type="hidden" name="a2_action" value="test_send">';
    echo '<input class="form-control" name="client_id" placeholder="ID do cliente" style="width:150px" required> ';
    echo '<select class="form-control" name="event">';
    foreach ($templates as $template) {
        echo '<option value="' . a2_wa_e($template->event) . '">' . a2_wa_e($template->name) . '</option>';
    }
    echo '</select> ';
    echo '<button class="btn btn-success" type="submit">Enviar teste</button>';
    echo '</form>';
    echo '</div>';

    echo '<div class="a2-wa-card">';
    echo '<h3>Ultimos envios</h3>';
    echo '<table class="a2-wa-table"><thead><tr><th>ID</th><th>Cliente</th><th>Evento</th><th>Telefone</th><th>Status</th><th>Resposta</th></tr></thead><tbody>';
    foreach ($logs as $log) {
        echo '<tr>';
        echo '<td>' . (int) $log->id . '</td>';
        echo '<td>' . (int) $log->client_id . '</td>';
        echo '<td>' . a2_wa_e($log->event) . '</td>';
        echo '<td>' . a2_wa_e($log->phone) . '</td>';
        echo '<td>' . a2_wa_e($log->status) . '</td>';
        echo '<td><small>' . a2_wa_e(substr((string) $log->response, 0, 240)) . '</small></td>';
        echo '</tr>';
    }
    echo '</tbody></table>';
    echo '</div>';
    echo '</div>';
}

function a2_wa_seed_templates()
{
    $defaults = [
        'client_add' => ['Novo cliente', 'Ola {{firstname}}, seja bem-vindo(a) a A2 Solucoes em T.I.'],
        'invoice_created' => ['Fatura criada', "Ola {{firstname}}, sua fatura #{{invoice_num}} no valor de {{invoice_total}} foi gerada.\nVencimento: {{invoice_due_date}}\n\nBoleto: {{boleto_link}}\nCartao: {{cartao_link}}\nPix: {{pix_link}}"],
        'invoice_paid' => ['Fatura paga', 'Ola {{firstname}}, confirmamos o pagamento da fatura #{{invoice_id}}. Obrigado!'],
        'service_created' => ['Novo servico', 'Ola {{firstname}}, seu servico {{service_name}} {{service_domain}} foi ativado com sucesso.'],
        'service_suspended' => ['Servico suspenso', 'Ola {{firstname}}, seu servico {{service_name}} {{service_domain}} foi suspenso. Caso precise de ajuda, fale com nosso suporte.'],
        'service_reactivated' => ['Servico reativado', 'Ola {{firstname}}, seu servico {{service_name}} {{service_domain}} foi reativado. Obrigado por continuar conosco.'],
        'invoice_reminder' => ['Lembrete de fatura', "Ola {{firstname}}, passando para lembrar da fatura #{{invoice_num}} no valor de {{invoice_total}}.\nVencimento: {{invoice_due_date}}\n\nAcesse: {{invoice_url}}\nBoleto: {{boleto_link}}\nCartao: {{cartao_link}}\nPix: {{pix_link}}"],
        'ticket_open' => ['Chamado aberto', 'Ola {{firstname}}, recebemos seu chamado #{{ticket_id}}: {{ticket_subject}}.'],
        'ticket_admin_reply' => ['Resposta no chamado', 'Ola {{firstname}}, atualizamos seu chamado #{{ticket_id}}: {{ticket_subject}}.'],
    ];

    foreach ($defaults as $event => $data) {
        $exists = Capsule::table(A2_WA_TEMPLATES_TABLE)->where('event', $event)->exists();
        if (!$exists) {
            Capsule::table(A2_WA_TEMPLATES_TABLE)->insert([
                'event' => $event,
                'name' => $data[0],
                'message' => $data[1],
                'enabled' => 0,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        }
    }
}

function a2_wa_save_template(array $data)
{
    $id = (int) ($data['id'] ?? 0);
    $message = trim((string) ($data['message'] ?? ''));
    $name = trim((string) ($data['name'] ?? ''));
    if (!$id || $message === '' || $name === '') {
        throw new RuntimeException('Preencha nome e mensagem.');
    }

    Capsule::table(A2_WA_TEMPLATES_TABLE)->where('id', $id)->update([
        'name' => $name,
        'message' => $message,
        'enabled' => !empty($data['enabled']) ? 1 : 0,
        'updated_at' => date('Y-m-d H:i:s'),
    ]);
}

function a2_wa_toggle_template(array $data)
{
    $id = (int) ($data['id'] ?? 0);
    if (!$id) {
        throw new RuntimeException('Mensagem invalida.');
    }

    Capsule::table(A2_WA_TEMPLATES_TABLE)->where('id', $id)->update([
        'enabled' => !empty($data['enabled']) ? 1 : 0,
        'updated_at' => date('Y-m-d H:i:s'),
    ]);
}

function a2_wa_e($value)
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function a2_wa_ensure_tables()
{
    if (!Capsule::schema()->hasTable(A2_WA_TEMPLATES_TABLE) || !Capsule::schema()->hasTable(A2_WA_LOGS_TABLE)) {
        a2_whatsapp_webhook_activate();
    }
    a2_wa_seed_templates();
}
