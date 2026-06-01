# LinkOps — UTM Branding Base Control

Sistema Operacional para Gestão de Distribuição de Tráfego.

---

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** + Shadcn/UI (Base UI)
- **PostgreSQL** + Prisma 7
- **NextAuth.js** (JWT, Credentials)
- **Recharts** (dashboard)
- **Rebrandly API** (encurtamento de links)
- **qrcode** (geração de QR Code SVG)
- **papaparse** (importação CSV)

---

## Requisitos

- Node.js 20+
- PostgreSQL (local ou Supabase/Railway/Neon)

---

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Edite o arquivo `.env`:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/linkops"
NEXTAUTH_SECRET="gere-com: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Criar o banco de dados

```bash
# Criar e aplicar migrations
npx prisma migrate dev --name init

# Gerar o client
npx prisma generate
```

### 4. Rodar o seed (cria admin e dados de exemplo)

```bash
npx prisma db seed
```

Credenciais do admin criado:
- **Email:** admin@linkops.com
- **Senha:** admin123

### 5. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## Módulos

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Dashboard | `/dashboard` | KPIs, gráfico de cliques, rankings |
| Veículos | `/vehicles` | Canais de distribuição (podcasts, redes sociais, etc) |
| Campanhas | `/campaigns` | Campanhas de marketing |
| Links | `/links` | Criação de links com UTMs + Rebrandly + QR Code |
| Templates UTM | `/templates` | Templates reutilizáveis por veículo |
| QR Codes | `/qrcodes` | Galeria de QR Codes gerados |
| Importação CSV | `/import` | Criação em massa via upload CSV |
| Histórico | `/history` | Auditoria de todas as alterações |
| Configurações | `/settings` | API Key Rebrandly, status de integrações (admin) |
| Usuários | `/users` | Gestão de usuários e permissões (admin) |

---

## Permissões

| Role | Pode criar/editar | Pode deletar | Acessa settings/users |
|------|:-----------------:|:------------:|:---------------------:|
| ADMIN | ✅ | ✅ | ✅ |
| MARKETING | ✅ | ✅ | ❌ |
| VIEWER | ❌ | ❌ | ❌ |

---

## Integração Rebrandly

1. Acesse `/settings` com uma conta ADMIN
2. Insira sua **API Key** do Rebrandly
3. Insira o **domínio curto** (ex: `on.g40.co`)
4. Clique em **Testar Conexão**
5. Clique em **Salvar**

A partir daí, todos os links criados serão automaticamente encurtados via Rebrandly.

---

## Deploy (Vercel)

```bash
# Configure as env vars no painel da Vercel:
DATABASE_URL=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://seu-dominio.vercel.app
```

---

## Integrações Futuras (V2/V3)

- **HubSpot** — vincular links a deals e contatos
- **Meta Ads** — associar links a ad sets
- **GA4** — correlacionar eventos de clique com conversões
