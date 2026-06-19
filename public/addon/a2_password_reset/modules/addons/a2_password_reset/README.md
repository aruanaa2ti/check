# A2 Password Reset

Tela personalizada da A2 para links de redefinicao de senha do WHMCS.

## Arquivos

- `modules/addons/a2_password_reset/`: addon para ativacao no admin do WHMCS.
- `a2-password-reset.php`: handler publico que deve ficar na raiz do WHMCS.
- `.htaccess`: precisa ter a regra abaixo antes do bloco gerenciado pelo WHMCS.

```apache
RewriteRule ^password/reset/redeem/([A-Za-z0-9]+)/?$ a2-password-reset.php?token=$1 [L,QSA]
```

## Instalacao

1. Copie `modules/addons/a2_password_reset` para `modules/addons/` do WHMCS.
2. Copie `a2-password-reset.php` para a raiz do WHMCS.
3. Adicione a regra de rewrite no `.htaccess`, antes de `### BEGIN - WHMCS managed rules`.
4. No admin do WHMCS, ative o addon em `Setup > Addon Modules`.
5. Gere um reset de senha para uma conta de teste e valide o fluxo inteiro.

## Observacao

O handler tenta localizar a tabela de token do WHMCS dinamicamente e so mantem a nova senha se `ValidateLogin` confirmar que o WHMCS aceitou a senha. Se o teste falhar, a senha anterior e restaurada.
