# StokaNet (saas-estoque)

Sistema de controle de estoque multi-empresa com login (NextAuth Credentials), painel e rotas protegidas.

## Rodar localmente

1) Instale dependencias:

```bash
npm install
```

2) Configure as variaveis de ambiente (Postgres):

- Copie `.env.example` para `.env.local` e preencha com um Postgres valido.
- Gere um secret forte para `NEXTAUTH_SECRET`.

3) Gere o Prisma e sincronize o schema:

```bash
npx prisma generate
npx prisma db push
```

Se o banco ja tiver dados e a alteracao de schema nao puder ser aplicada automaticamente, use `npx prisma db push --force-reset` em ambiente local de desenvolvimento.

4) (Opcional) Seed com usuario admin:

```bash
npm run seed
```

5) Inicie o servidor:

```bash
npm run dev
```

## Deploy na Netlify ou Vercel

Este projeto nao leva o banco junto com o deploy. A Netlify e o Vercel hospedam apenas o app; os dados precisam ficar em um Postgres remoto permanente.

1) Crie um Postgres remoto (recomendado: Neon, Supabase ou Railway) e copie as URLs.

2) No painel da Netlify ou do Vercel, configure as variaveis de ambiente:

- `DATABASE_URL` (pooler/pooled)
- `DIRECT_URL` (direct)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (ex: `https://seu-app.netlify.app` ou `https://seu-app.vercel.app`)
- `MERCADOPAGO_ACCESS_TOKEN` quando usar assinatura/checkout
- `FOCUS_NFE_TOKEN` e demais variaveis de NFe quando usar emissao fiscal

3) Antes de abrir o site publicado, aplique o schema no banco remoto:

```bash
npx prisma db push
```

4) Se voce quer levar os usuarios e dados existentes para o ambiente publicado, migre o banco local para o banco remoto. Exemplo com Postgres:

```bash
pg_dump "$DATABASE_URL_LOCAL" > backup.sql
psql "$DATABASE_URL_REMOTO" < backup.sql
```

No Windows, o fluxo costuma ser este:

```powershell
$env:PGPASSWORD = "sua_senha_local"
pg_dump "postgresql://usuario@localhost:5432/seu_banco?sslmode=disable" --no-owner --no-privileges --clean --if-exists --file backup.sql

$env:PGPASSWORD = "sua_senha_remota"
psql "postgresql://usuario@host-remoto:5432/seu_banco?sslmode=require" --file backup.sql
```

Use a URL direta do banco para esse processo. Se o provedor fornecer uma URL pooler para a aplicacao, mantenha `DATABASE_URL` para o app e use a conexao direta em `DIRECT_URL` e na migracao.

5) Se o banco remoto estiver vazio, rode o seed para criar a conta admin de demo:

```bash
npm run seed
```

6) Faça o deploy. O script `build` roda apenas `prisma generate` e `next build`; a sincronizacao do banco continua sendo responsabilidade do banco remoto.

## Deploy na Netlify

Na Netlify, verifique tambem se o projeto esta com o build command apontando para `npm run build` e se as mesmas variaveis de ambiente foram cadastradas no site.

## Login seed (dev)

Se voce rodar `npm run seed`, o admin sera:

- Email: `admin@auroracomercio.com`
- Senha: `admin123`
