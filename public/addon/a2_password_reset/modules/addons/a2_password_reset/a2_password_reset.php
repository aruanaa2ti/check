<?php

if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}

function a2_password_reset_config()
{
    return [
        'name' => 'A2 Password Reset',
        'description' => 'Tela personalizada da A2 para o link de redefinicao de senha do WHMCS.',
        'version' => '1.0.0',
        'author' => 'a2 Solucoes em T.I.',
        'fields' => [
            'login_url' => [
                'FriendlyName' => 'URL da Area do Cliente',
                'Type' => 'text',
                'Size' => '80',
                'Default' => 'https://a2ti.com.br/cliente',
                'Description' => 'Destino apos redefinir a senha com sucesso.',
            ],
        ],
    ];
}

function a2_password_reset_activate()
{
    return [
        'status' => 'success',
        'description' => 'Modulo ativado. Envie tambem o arquivo a2-password-reset.php para a raiz do WHMCS e adicione a regra no .htaccess.',
    ];
}

function a2_password_reset_deactivate()
{
    return [
        'status' => 'success',
        'description' => 'Modulo desativado.',
    ];
}

function a2_password_reset_output($vars)
{
    $handler = rtrim($vars['SystemURL'] ?? '', '/') . '/a2-password-reset.php';
    echo '<div class="panel panel-default">';
    echo '<div class="panel-heading"><strong>A2 Password Reset</strong></div>';
    echo '<div class="panel-body">';
    echo '<p>Este addon fornece uma tela personalizada para redefinicao de senha.</p>';
    echo '<p><strong>Handler:</strong> <code>' . htmlspecialchars($handler, ENT_QUOTES, 'UTF-8') . '</code></p>';
    echo '<p>Adicione no <code>.htaccess</code>, antes do bloco gerenciado pelo WHMCS:</p>';
    echo '<pre>RewriteRule ^password/reset/redeem/([A-Za-z0-9]+)/?$ a2-password-reset.php?token=$1 [L,QSA]</pre>';
    echo '<p>Depois teste com um link novo de redefinicao em uma conta de teste.</p>';
    echo '</div>';
    echo '</div>';
}
