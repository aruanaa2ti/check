# A2 Password Reset para WHMCS

Pacote limpo com os arquivos necessarios para usar a tela personalizada da A2 no reset de senha do WHMCS.

## Estrutura do pacote

```text
public/addon/a2_password_reset/
├── modules/addons/a2_password_reset/
│   ├── a2_password_reset.php
│   ├── index.php
│   ├── README.md
│   └── whmcs.json
├── root/
│   └── a2-password-reset.php
├── README-INSTALACAO.md
└── htaccess-exemplo.txt
```

## O que subir no WHMCS

1. Subir a pasta:

```text
modules/addons/a2_password_reset
```

Para:

```text
/modules/addons/a2_password_reset
```

2. Subir o arquivo:

```text
root/a2-password-reset.php
```

Para a raiz do WHMCS:

```text
/a2-password-reset.php
```

3. Adicionar esta regra no `.htaccess` da raiz do WHMCS, antes do bloco `WHMCS managed rules`:

```apache
RewriteRule ^password/reset/redeem/([A-Za-z0-9]+)/?$ a2-password-reset.php?token=$1 [L,QSA]
```

4. No admin do WHMCS, ativar o addon em:

```text
Setup > Addon Modules
```

Ou no caminho equivalente da sua versao.

## Link do template de e-mail

Se o WHMCS ja envia o link neste formato, nao precisa trocar:

```text
https://sistema.a2ti.com.br/password/reset/redeem/TOKEN
```

A regra do `.htaccess` intercepta esse mesmo link e abre a tela personalizada da A2.

No template de e-mail, mantenha a variavel original do WHMCS para o link de reset. Exemplo:

```html
<a href="{$reset_password_url}">Redefinir minha senha</a>
```

Se a sua instalacao usar outra variavel, mantenha a que ja esta funcionando hoje no template.

## Teste obrigatorio

Antes de liberar para clientes:

1. Gere reset para uma conta de teste.
2. Clique no link recebido por e-mail.
3. Confirme se abriu a tela A2.
4. Defina uma senha nova.
5. Confirme login em `https://a2ti.com.br/cliente`.
6. Confirme que o mesmo link nao funciona novamente.

## Atualizacao do handler

Se precisar corrigir o fluxo, normalmente basta substituir este arquivo no servidor:

```text
/a2-password-reset.php
```

Depois de substituir, solicite um novo reset de senha. Links antigos podem estar expirados ou ja consumidos pelo WHMCS.

## Erro "Link expirado"

Se aparecer `Link expirado. Solicite uma nova redefinicao de senha.` logo em um link novo:

1. Substitua `/a2-password-reset.php` pela versao mais recente deste pacote.
2. Gere um novo reset.
3. Teste novamente em uma conta de teste.

Essa versao procura apenas tabelas relacionadas a usuario/reset/senha para evitar capturar tokens de outras areas do WHMCS.

## Observacao de seguranca

O arquivo `a2-password-reset.php` tenta localizar a tabela de token do WHMCS dinamicamente. Ele so mantem a nova senha se a API `ValidateLogin` confirmar que o WHMCS aceitou o login com a senha nova. Se a validacao falhar, a senha anterior e restaurada.

## Compatibilidade PHP

O pacote foi escrito para ser compativel com PHP 7.4. Ele nao usa recursos exclusivos do PHP 8.

Requisitos esperados no servidor WHMCS:

- PHP 7.4 ou superior.
- ionCube Loader ativo, pois o WHMCS precisa dele.
- WHMCS carregando normalmente pelo `init.php`.
- Extensao `bcrypt/password_hash` disponivel, nativa no PHP 7.4.
