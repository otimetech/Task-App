# ManutGO — frontend (Nuxt)

Nuxt 4 (SSR) + Tailwind CSS + Supabase. Documentação do projeto: [`../PROJETO.md`](../PROJETO.md); design: [`../design.md`](../design.md).

## Rodar

```bash
cp .env.example .env   # preencher NUXT_PUBLIC_SUPABASE_KEY (chave publicável)
npm install
npm run dev            # http://localhost:3000
npm test               # Vitest (regras em shared/utils)
npm run build          # gera .output/ (node .output/server/index.mjs)
```

## Variáveis de ambiente

| Variável | Dev | Produção |
|---|---|---|
| `NUXT_PUBLIC_SUPABASE_URL` | `https://hezxupksbntcwaxkmlmg.supabase.co` | igual |
| `NUXT_PUBLIC_SUPABASE_KEY` | chave publicável | igual |
| `NUXT_PUBLIC_BASE_DOMAIN` | `localhost` | `manutgo.otimetech.com.br` |
| `NUXT_PUBLIC_SUPABASE_COOKIE_OPTIONS_DOMAIN` | vazio | `.manutgo.otimetech.com.br` |
| `NUXT_PUBLIC_APP_NAME` | `ManutGO` | `ManutGO` |

Todas são lidas em runtime (o build é o mesmo para qualquer ambiente).

## Empresas (tenants) em desenvolvimento

- Raiz: `http://localhost:3000` (login geral, minhas empresas, criar empresa).
- Empresa: `http://<subdominio>.localhost:3000` — o Chrome resolve `*.localhost` sem configuração.
- Com `localhost` a sessão **não** é compartilhada entre raiz e subdomínios (o navegador não aceita cookie de domínio em `localhost`); é preciso entrar de novo em cada host.
- Para testar a sessão compartilhada, use `lvh.me` (aponta para 127.0.0.1, inclusive subdomínios):

```bash
NUXT_PUBLIC_BASE_DOMAIN=lvh.me \
NUXT_PUBLIC_SUPABASE_COOKIE_OPTIONS_DOMAIN=.lvh.me \
NUXT_PUBLIC_SUPABASE_COOKIE_OPTIONS_SECURE=false \
node .output/server/index.mjs
# http://lvh.me:3000 e http://<subdominio>.lvh.me:3000
```

## Estrutura

- `shared/utils/` — regras puras usadas no app e no servidor, todas com teste (`tests/unit/`): host/tenant, tema, CNPJ, subdomínio, `rpc()`, acesso, menu, erros de auth.
- `shared/types/database.ts` — tipos gerados do banco (regerar após migrations).
- `server/middleware/tenant.ts` — resolve a empresa pelo host (`resolver_tenant`, cache 60 s).
- `app/middleware/acesso.global.ts` — decide login, `/sem-acesso`, admin e 404.
- `app/pages/` — raiz: `login`, `cadastro`, `recuperar-senha`, `redefinir-senha`, `empresas/*`; subdomínio: `/`, `sem-acesso`, `usuarios`, `configuracoes`.
