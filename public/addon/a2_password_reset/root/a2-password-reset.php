<?php

use WHMCS\Database\Capsule;

require __DIR__ . '/init.php';

const A2_CLIENT_LOGIN_URL = 'https://a2ti.com.br/cliente';

$token = preg_replace('/[^A-Za-z0-9]/', '', (string) ($_GET['token'] ?? $_POST['token'] ?? ''));
$error = '';
$success = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = (string) ($_POST['password'] ?? '');
    $confirm = (string) ($_POST['confirm_password'] ?? '');

    if (strlen($token) < 32) {
        $error = 'Link invalido ou expirado. Solicite uma nova redefinicao de senha.';
    } elseif (strlen($password) < 8) {
        $error = 'A senha precisa ter pelo menos 8 caracteres.';
    } elseif ($password !== $confirm) {
        $error = 'As senhas nao conferem.';
    } else {
        try {
            $reset = a2_find_reset_token($token);
            if (!$reset) {
                throw new RuntimeException('Link invalido ou expirado. Solicite uma nova redefinicao de senha.');
            }
            if (a2_reset_token_expired($reset)) {
                logActivity('A2 Password Reset: token expirado em ' . $reset['table'] . '.' . $reset['token_column']);
                throw new RuntimeException('Link expirado. Solicite uma nova redefinicao de senha.');
            }

            $user = a2_find_user_for_reset($reset);
            if (!$user) {
                throw new RuntimeException('Nao foi possivel localizar o usuario deste link.');
            }

            $updated = a2_update_user_password($user, $password);
            if (!$updated) {
                throw new RuntimeException('Nao foi possivel salvar a nova senha.');
            }

            $loginResult = localAPI('ValidateLogin', [
                'email' => $user->email,
                'password2' => $password,
            ]);

            if (($loginResult['result'] ?? '') !== 'success') {
                a2_restore_user_password($user);
                throw new RuntimeException('A nova senha nao foi validada pelo WHMCS. Nenhuma alteracao foi mantida.');
            }

            a2_delete_reset_token($reset);
            logActivity('A2 Password Reset: senha redefinida para o usuario ' . $user->id . ' (' . $user->email . ')');
            $success = true;
        } catch (Throwable $e) {
            $error = $e->getMessage();
        }
    }
}

function a2_find_reset_token(string $token): ?array
{
    $tokenValues = array_unique([$token, hash('sha256', $token)]);
    $candidateTables = a2_candidate_token_tables();

    foreach ($candidateTables as $table) {
        $columns = a2_table_columns($table);
        if (!a2_table_can_be_password_reset($table, $columns)) {
            continue;
        }
        $tokenColumns = array_values(array_intersect($columns, [
            'token',
            'reset_token',
            'resetkey',
            'key',
            'selector',
            'hash',
        ]));

        foreach ($tokenColumns as $tokenColumn) {
            $row = Capsule::table($table)->whereIn($tokenColumn, $tokenValues)->first();
            if ($row) {
                return [
                    'table' => $table,
                    'token_column' => $tokenColumn,
                    'columns' => $columns,
                    'row' => $row,
                ];
            }
        }
    }

    return null;
}

function a2_candidate_token_tables(): array
{
    $tables = [];
    $known = [
        'tblpasswordresets',
        'tblpassword_reset_tokens',
        'password_resets',
        'tbluser_password_resets',
        'tblusers_password_resets',
    ];

    foreach ($known as $table) {
        if (Capsule::schema()->hasTable($table)) {
            $tables[] = $table;
        }
    }

    try {
        $dbName = Capsule::connection()->getDatabaseName();
        $rows = Capsule::select(
            'select table_name from information_schema.columns where table_schema = ? and column_name in ("token", "reset_token", "resetkey", "key", "selector", "hash")',
            [$dbName]
        );
        foreach ($rows as $row) {
            $tableName = (string) $row->table_name;
            if (preg_match('/(password|reset|user)/i', $tableName)) {
                $tables[] = $tableName;
            }
        }
    } catch (Throwable $e) {
        // Some database users cannot read information_schema. The known list above is enough for most installs.
    }

    return array_values(array_unique($tables));
}

function a2_table_can_be_password_reset(string $table, array $columns): bool
{
    if (!preg_match('/(password|reset|user)/i', $table)) {
        return false;
    }

    $hasToken = (bool) array_intersect($columns, [
        'token',
        'reset_token',
        'resetkey',
        'key',
        'selector',
        'hash',
    ]);
    $hasIdentity = (bool) array_intersect($columns, [
        'user_id',
        'userid',
        'uid',
        'email',
        'user_email',
    ]);

    return $hasToken && $hasIdentity;
}

function a2_table_columns(string $table): array
{
    static $cache = [];
    if (!isset($cache[$table])) {
        $cache[$table] = Capsule::schema()->getColumnListing($table);
    }
    return $cache[$table];
}

function a2_find_user_for_reset(array $reset): ?object
{
    $row = $reset['row'];
    $columns = $reset['columns'];

    foreach (['user_id', 'userid', 'uid'] as $column) {
        if (in_array($column, $columns, true) && !empty($row->{$column})) {
            $user = Capsule::table('tblusers')->where('id', (int) $row->{$column})->first();
            if ($user) {
                return $user;
            }
        }
    }

    foreach (['email', 'user_email'] as $column) {
        if (in_array($column, $columns, true) && !empty($row->{$column})) {
            $user = Capsule::table('tblusers')->where('email', (string) $row->{$column})->first();
            if ($user) {
                return $user;
            }
        }
    }

    return null;
}

function a2_reset_token_expired(array $reset): bool
{
    $row = $reset['row'];
    $columns = $reset['columns'];

    foreach (['expires_at', 'expires', 'expiry', 'expiration'] as $column) {
        if (in_array($column, $columns, true) && !empty($row->{$column})) {
            $expiresAt = strtotime((string) $row->{$column});
            return $expiresAt !== false && $expiresAt < time();
        }
    }

    return false;
}

function a2_update_user_password(object $user, string $password): bool
{
    $columns = a2_table_columns('tblusers');
    $hashColumn = in_array('password', $columns, true) ? 'password' : null;
    if (!$hashColumn && in_array('password_hash', $columns, true)) {
        $hashColumn = 'password_hash';
    }
    if (!$hashColumn) {
        return false;
    }

    $user->__a2_original_hash_column = $hashColumn;
    $user->__a2_original_hash = $user->{$hashColumn} ?? '';
    $payload = [
        $hashColumn => password_hash($password, PASSWORD_BCRYPT),
    ];
    if (in_array('updated_at', $columns, true)) {
        $payload['updated_at'] = Capsule::raw('NOW()');
    }

    return Capsule::table('tblusers')
        ->where('id', (int) $user->id)
        ->update($payload) >= 0;
}

function a2_restore_user_password(object $user): void
{
    if (empty($user->__a2_original_hash_column)) {
        return;
    }

    Capsule::table('tblusers')
        ->where('id', (int) $user->id)
        ->update([
            $user->__a2_original_hash_column => $user->__a2_original_hash,
        ]);
}

function a2_delete_reset_token(array $reset): void
{
    $row = $reset['row'];
    $table = $reset['table'];
    $tokenColumn = $reset['token_column'];
    $tokenValue = $row->{$tokenColumn};

    Capsule::table($table)->where($tokenColumn, $tokenValue)->delete();
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

?><!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>Redefinir senha - A2 Solucoes em T.I.</title>
    <style>
        :root {
            --brand: #14930f;
            --brand-dark: #0f7a0c;
            --ink: #111827;
            --muted: #667085;
            --border: #e5e7eb;
            --bg: #f6f8fb;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: radial-gradient(circle at 80% 0%, rgba(20,147,15,.14), transparent 32%), var(--bg);
            color: var(--ink);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .wrap {
            width: min(920px, calc(100% - 32px));
            overflow: hidden;
            border: 1px solid var(--border);
            border-radius: 14px;
            background: #fff;
            box-shadow: 0 24px 70px rgba(15, 23, 42, .12);
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            min-height: 520px;
        }
        .brand {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 42px;
            background: linear-gradient(145deg, #090909, #172017);
            color: #fff;
        }
        .logo {
            width: 116px;
            height: auto;
            border-radius: 10px;
        }
        .brand h2 {
            margin: 0 0 12px;
            font-size: 34px;
            line-height: 1.05;
            letter-spacing: 0;
        }
        .brand p, .fine {
            color: rgba(255,255,255,.68);
            font-size: 14px;
            line-height: 1.7;
        }
        .panel {
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 42px;
        }
        h1 {
            margin: 0;
            font-size: 26px;
            letter-spacing: 0;
        }
        .lead {
            margin: 10px 0 28px;
            color: var(--muted);
            font-size: 14px;
            line-height: 1.65;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-size: 13px;
            font-weight: 700;
        }
        input {
            width: 100%;
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 13px 14px;
            font-size: 15px;
            outline: none;
        }
        input:focus {
            border-color: var(--brand);
            box-shadow: 0 0 0 3px rgba(20,147,15,.16);
        }
        .field + .field { margin-top: 16px; }
        .alert {
            margin-bottom: 18px;
            border-radius: 10px;
            padding: 13px 14px;
            font-size: 13px;
            line-height: 1.5;
        }
        .alert.error {
            border: 1px solid #fecaca;
            background: #fef2f2;
            color: #991b1b;
        }
        .alert.success {
            border: 1px solid #bbf7d0;
            background: #f0fdf4;
            color: #166534;
        }
        button, .button {
            display: inline-flex;
            width: 100%;
            align-items: center;
            justify-content: center;
            margin-top: 22px;
            border: 0;
            border-radius: 10px;
            background: var(--brand);
            color: #fff;
            padding: 13px 18px;
            font-size: 14px;
            font-weight: 800;
            text-decoration: none;
            cursor: pointer;
        }
        button:hover, .button:hover { background: var(--brand-dark); }
        .back {
            display: inline-block;
            margin-top: 18px;
            color: var(--muted);
            font-size: 13px;
            text-decoration: none;
        }
        .back:hover { color: var(--ink); }
        @media (max-width: 760px) {
            body { align-items: stretch; }
            .wrap { width: 100%; min-height: 100vh; border: 0; border-radius: 0; }
            .grid { grid-template-columns: 1fr; }
            .brand { min-height: 260px; padding: 28px; }
            .panel { padding: 28px; }
        }
    </style>
</head>
<body>
    <main class="wrap">
        <div class="grid">
            <section class="brand">
                <img class="logo" src="/assets/img/logo.png" alt="A2 Solucoes em T.I." onerror="this.style.display='none'">
                <div>
                    <h2>Redefina seu acesso com seguranca.</h2>
                    <p>Crie uma nova senha para continuar usando a Area do Cliente A2.</p>
                </div>
                <div class="fine">Link seguro de uso unico.</div>
            </section>
            <section class="panel">
                <?php if ($success): ?>
                    <div class="alert success">Senha redefinida com sucesso.</div>
                    <h1>Tudo certo.</h1>
                    <p class="lead">Agora voce ja pode acessar a Area do Cliente com a nova senha.</p>
                    <a class="button" href="<?= e(A2_CLIENT_LOGIN_URL) ?>">Acessar Area do Cliente</a>
                <?php else: ?>
                    <h1>Nova senha</h1>
                    <p class="lead">Informe sua nova senha abaixo. Ela sera atualizada no sistema da A2.</p>
                    <?php if ($error): ?>
                        <div class="alert error"><?= e($error) ?></div>
                    <?php endif; ?>
                    <form method="post" action="">
                        <input type="hidden" name="token" value="<?= e($token) ?>">
                        <div class="field">
                            <label for="password">Senha</label>
                            <input id="password" name="password" type="password" minlength="8" required autocomplete="new-password">
                        </div>
                        <div class="field">
                            <label for="confirm_password">Confirmar senha</label>
                            <input id="confirm_password" name="confirm_password" type="password" minlength="8" required autocomplete="new-password">
                        </div>
                        <button type="submit">Redefinir senha</button>
                    </form>
                    <a class="back" href="<?= e(A2_CLIENT_LOGIN_URL) ?>">Voltar ao login</a>
                <?php endif; ?>
            </section>
        </div>
    </main>
</body>
</html>
