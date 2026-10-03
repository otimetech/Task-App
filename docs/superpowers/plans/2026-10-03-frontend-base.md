# Frontend base (Fase 2) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Frontend Nuxt SSR multi-tenant com tema por empresa, autenticação, onboarding, escolha de empresa, gestão de usuários e configurações, sobre o backend Supabase existente.

**Architecture:** Nuxt 4 em `web/`. Um server middleware resolve o tenant pelo host (`resolver_tenant`) e o tema é aplicado no SSR via variáveis CSS. Regras puras (host, tema, CNPJ, subdomínio, acesso, rpc) ficam em `web/shared/utils/`, testadas com Vitest e usadas pelo app e pelo server. Sessão via `@nuxtjs/supabase` com cookie de domínio compartilhado.

**Tech Stack:** Nuxt 4, Vue 3, `@nuxtjs/tailwindcss` (Tailwind 3), `@nuxtjs/supabase`, `lucide-vue-next`, Vitest, Supabase (projeto `hezxupksbntcwaxkmlmg`).

**Spec:** `docs/superpowers/specs/2026-10-03-frontend-base-design.md`

## Global Constraints

- Textos da interface em pt-BR; documentação em português; código (nomes) em português como no banco (`empresa`, `vinculo`, `subdominio`).
- UI segue `design.md` (tokens seção 9, componentes seção 6). Toda tela nova é registrada em `design.md` seção 11 + histórico (seção 12).
- Após cada task: nova linha em `PROJETO.md` → "Histórico de alterações" e checklist da Fase 2 atualizado, no mesmo commit.
- Cores de status (`success-*`, `danger-*`, `warning-*`) nunca mudam por tenant; só `brand-*`.
- Domínio base do banco: `manutgo.otimetech.com.br` (constante `DOMINIO_BASE_BANCO`). Domínio servido pelo app: `NUXT_PUBLIC_BASE_DOMAIN` (`localhost` em dev, `manutgo.otimetech.com.br` em produção).
- Nome da plataforma exibido na raiz: `NUXT_PUBLIC_APP_NAME` (padrão `ManutGO`, pendente de confirmação do responsável).
- Mensagens de erro de regra vêm do banco; o frontend não reescreve.
- Erro de rede: texto exato `Não foi possível conectar. Tente novamente.`
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Ajuste em relação à spec (seção 3):** em vez de traduzir `*.localhost` para o domínio de produção, `analisarHost` usa `NUXT_PUBLIC_BASE_DOMAIN` (`localhost` em dev) e o server sempre consulta o banco com `<slug>.manutgo.otimetech.com.br`. Mesmo comportamento, e permite testar sessão compartilhada com `lvh.me` (Task 6).

## Review Focus

1. Host com letras maiúsculas, porta ou ponto final (`ABC.localhost:3000.`) → mesma empresa que `abc.localhost` (Task 2 testa).
2. Usuário pendente ou desativado que digita `/usuarios` direto no subdomínio → `/sem-acesso`, nunca a página (Task 9 testa).
3. Admin rebaixado/desativado com o app aberto → próxima navegação revalida vínculo após ações de gestão (Task 9: `recarregarVinculos` chamado após cada ação; Task 13 verifica).
4. `redirect` malicioso no login (`/login?redirect=https://evil.com`) → ignora e usa destino padrão (Task 9 testa `redirectSeguro`).
5. Cor inválida vinda do banco (não `#RRGGBB`) → tema padrão, sem quebrar o CSS (Task 3 testa).

---

## Estrutura de arquivos

```
web/
  nuxt.config.ts  tailwind.config.ts  vitest.config.ts  package.json  .env.example
  shared/
    utils/host.ts  tema.ts  cnpj.ts  subdominio.ts  rpc.ts  acesso.ts
    types/database.ts         # gerado (supabase gen types)
    types/app.ts              # Tenant, Vinculo, UsuarioEmpresa
  server/middleware/tenant.ts
  app/
    app.vue  error.vue
    assets/css/main.css
    plugins/tenant.ts
    composables/useTenant.ts useMinhasEmpresas.ts useToast.ts useUsuariosEmpresa.ts useEmpresaAtual.ts
    middleware/acesso.global.ts
    layouts/default.vue publico.vue
    components/  (Task 8, 12)
    pages/ login.vue cadastro.vue recuperar-senha.vue redefinir-senha.vue sem-acesso.vue index.vue
           usuarios.vue configuracoes.vue empresas/index.vue empresas/nova.vue empresas/solicitar.vue
  tests/unit/*.test.ts
supabase/migrations/<versão>_storage_logos.sql
```

---

### Task 1: Scaffold Nuxt + Tailwind + Supabase + Vitest

**Files:**
- Create: `web/` (via `npx nuxi@latest init web --packageManager npm --gitInit false`), `web/tailwind.config.ts`, `web/app/assets/css/main.css`, `web/vitest.config.ts`, `web/.env.example`, `web/.env` (não versionado), `web/shared/types/database.ts`
- Modify: `web/nuxt.config.ts`, `web/package.json`, `.gitignore`

**Interfaces:**
- Produces: `runtimeConfig.public.baseDomain`, `runtimeConfig.public.cookieDomain`, `runtimeConfig.public.appName`; constante `DOMINIO_BASE_BANCO = 'manutgo.otimetech.com.br'` em `web/shared/utils/host.ts` (criado vazio aqui, preenchido na Task 2); scripts `npm run dev`, `npm run build`, `npm test` (`vitest run`).

- [ ] **Step 1:** Criar projeto e instalar: `@nuxtjs/tailwindcss @nuxtjs/supabase lucide-vue-next` e dev `vitest`.
- [ ] **Step 2:** `nuxt.config.ts`: `ssr: true`; módulos tailwind e supabase; `css: ['~/assets/css/main.css']`; Google Fonts Inter (400/500/600/700) via `app.head.link`; `supabase: { redirect: false, types: '~~/shared/types/database.ts', cookieOptions: { domain: process.env.NUXT_PUBLIC_COOKIE_DOMAIN || undefined, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' } }`; `runtimeConfig.public: { baseDomain: 'localhost', cookieDomain: '', appName: 'ManutGO' }`.
- [ ] **Step 3:** `tailwind.config.ts` = bloco da seção 9 do `design.md`, acrescentando `brand['50-border']: 'var(--brand-50-border, #E3EAEF)'`. `main.css`: diretivas Tailwind + `body { @apply bg-app text-ink font-sans; }`.
- [ ] **Step 4:** `.env.example` com `SUPABASE_URL`, `SUPABASE_KEY`, `NUXT_PUBLIC_BASE_DOMAIN=localhost`, `NUXT_PUBLIC_COOKIE_DOMAIN=`, `NUXT_PUBLIC_APP_NAME=ManutGO`. `.env` preenchido com URL e chave publicável (MCP `get_project_url` / `get_publishable_keys`). `.gitignore` raiz: `web/node_modules`, `web/.nuxt`, `web/.output`, `web/.env`.
- [ ] **Step 5:** Gerar tipos com MCP `generate_typescript_types` → `web/shared/types/database.ts`.
- [ ] **Step 6:** `vitest.config.ts` (environment `node`, include `tests/unit/**/*.test.ts`) e `tests/unit/smoke.test.ts` com `expect(1).toBe(1)`.
- [ ] **Step 7: Verificar** — `npm test` → 1 passed; `npm run build` → sem erro; `npm run dev` e abrir `http://localhost:3000` → página com fundo `#EEF0F2` e fonte Inter.
- [ ] **Step 8: Commit** — `chore(web): scaffold Nuxt 4 with Tailwind, Supabase and Vitest` (inclui `PROJETO.md`).

---

### Task 2: `analisarHost` e URLs entre hosts

**Files:**
- Create/Modify: `web/shared/utils/host.ts`
- Test: `web/tests/unit/host.test.ts`

**Interfaces:**
- Produces:
  - `type ContextoHost = { tipo: 'raiz' } | { tipo: 'subdominio'; slug: string; hostBanco: string } | { tipo: 'proprio'; hostBanco: string } | { tipo: 'invalido' }`
  - `normalizarHost(host: string): string` — minúsculas, sem porta, sem ponto final, trim.
  - `analisarHost(host: string, baseDomain: string): ContextoHost` — `hostBanco` do subdomínio = `` `${slug}.${DOMINIO_BASE_BANCO}` ``.
  - `montarUrlEmpresa(slug: string, hostAtual: string, baseDomain: string, caminho = '/'): string`
  - `montarUrlRaiz(hostAtual: string, baseDomain: string, caminho = '/'): string`
  - Ambas preservam a porta do `hostAtual` e usam `http` quando `baseDomain` é `localhost` ou `lvh.me`, senão `https`.

- [ ] **Step 1: Testes que falham**

```ts
expect(analisarHost('localhost:3000', 'localhost')).toEqual({ tipo: 'raiz' })
expect(analisarHost('manutgo.otimetech.com.br', 'manutgo.otimetech.com.br')).toEqual({ tipo: 'raiz' })
expect(analisarHost('ABC.localhost:3000.', 'localhost')).toEqual({ tipo: 'subdominio', slug: 'abc', hostBanco: 'abc.manutgo.otimetech.com.br' })
expect(analisarHost('abc.manutgo.otimetech.com.br', 'manutgo.otimetech.com.br')).toEqual({ tipo: 'subdominio', slug: 'abc', hostBanco: 'abc.manutgo.otimetech.com.br' })
expect(analisarHost('x.abc.localhost', 'localhost')).toEqual({ tipo: 'invalido' })
expect(analisarHost('os.cliente.com.br', 'manutgo.otimetech.com.br')).toEqual({ tipo: 'proprio', hostBanco: 'os.cliente.com.br' })
expect(analisarHost('', 'localhost')).toEqual({ tipo: 'invalido' })
expect(montarUrlEmpresa('abc', 'localhost:3000', 'localhost', '/usuarios')).toBe('http://abc.localhost:3000/usuarios')
expect(montarUrlEmpresa('abc', 'manutgo.otimetech.com.br', 'manutgo.otimetech.com.br')).toBe('https://abc.manutgo.otimetech.com.br/')
expect(montarUrlRaiz('abc.localhost:3000', 'localhost', '/empresas')).toBe('http://localhost:3000/empresas')
```

- [ ] **Step 2:** `npm test -- host` → FAIL (funções não existem).
- [ ] **Step 3:** Implementar em `host.ts`.
- [ ] **Step 4:** `npm test -- host` → PASS.
- [ ] **Step 5: Commit** — `feat(web): parse tenant host and build cross-host URLs`.

---

### Task 3: Tema por empresa

**Files:**
- Create: `web/shared/utils/tema.ts`
- Test: `web/tests/unit/tema.test.ts`

**Interfaces:**
- Produces: `gerarVariaveisTema(cores: { cor_primaria: string | null; cor_secundaria: string | null }): Record<string, string>` e `estiloTema(vars: Record<string, string>): string` (`'--a:x;--b:y'`, vazio se sem variáveis).

Valores fixados pela spec (primária `P`):
`--brand-700: P` · `--brand-900: color-mix(in srgb, P 55%, black)` · `--brand-600: color-mix(in srgb, P 85%, white)` · `--brand-100: color-mix(in srgb, P 22%, white)` · `--brand-50: color-mix(in srgb, P 8%, white)` · `--brand-50-border: color-mix(in srgb, P 12%, white)`. Secundária válida `S` substitui `--brand-600: S` (mesmo sem primária). Cor válida = `/^#[0-9A-Fa-f]{6}$/`; inválida é ignorada.

- [ ] **Step 1: Testes que falham**

```ts
expect(gerarVariaveisTema({ cor_primaria: null, cor_secundaria: null })).toEqual({})
const v = gerarVariaveisTema({ cor_primaria: '#AA0000', cor_secundaria: null })
expect(v['--brand-700']).toBe('#AA0000')
expect(v['--brand-900']).toBe('color-mix(in srgb, #AA0000 55%, black)')
expect(v['--brand-50']).toBe('color-mix(in srgb, #AA0000 8%, white)')
expect(gerarVariaveisTema({ cor_primaria: '#AA0000', cor_secundaria: '#00AA00' })['--brand-600']).toBe('#00AA00')
expect(gerarVariaveisTema({ cor_primaria: 'azul', cor_secundaria: 'red' })).toEqual({})
expect(estiloTema({ '--brand-700': '#AA0000' })).toBe('--brand-700:#AA0000')
```

- [ ] **Step 2:** `npm test -- tema` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test -- tema` → PASS.
- [ ] **Step 5: Commit** — `feat(web): derive tenant theme CSS variables`.

---

### Task 4: CNPJ e subdomínio (espelho do banco)

**Files:**
- Create: `web/shared/utils/cnpj.ts`, `web/shared/utils/subdominio.ts`
- Test: `web/tests/unit/cnpj.test.ts`, `web/tests/unit/subdominio.test.ts`

**Interfaces:**
- Produces:
  - `normalizarCnpj(v: string): string` (maiúsculas, só `[0-9A-Z]`), `cnpjValido(v: string): boolean` (mesmo algoritmo de `public.cnpj_valido`: 12 `[0-9A-Z]` + 2 dígitos, rejeita repetidos, valor = `charCode - 48`, pesos `5,4,3,2,9,8,7,6,5,4,3,2` e `6,5,4,3,2,9,8,7,6,5,4,3,2`, resto < 2 → 0), `mascararCnpj(v: string): string` (formato `XX.XXX.XXX/XXXX-XX` progressivo enquanto digita).
  - `SUBDOMINIOS_RESERVADOS: readonly string[]` (mesma lista da migration `branding_dominios`), `normalizarSubdominio(v: string): string`, `validarSubdominio(v: string): string | null` (mesmas mensagens exatas de `public.validar_subdominio`).

- [ ] **Step 1: Testes que falham** (casos conferidos no banco em 2026-10-03)

```ts
for (const ok of ['11.222.333/0001-81', '11444777000161', '12.ABC.345/01DE-35', '12abc34501de35']) expect(cnpjValido(ok)).toBe(true)
for (const ruim of ['11222333000182', '00000000000000', '1122233300018', '11.222.333/0001-8A']) expect(cnpjValido(ruim)).toBe(false)
expect(mascararCnpj('12abc34501de35')).toBe('12.ABC.345/01DE-35')
expect(mascararCnpj('11222')).toBe('11.222')
expect(validarSubdominio('')).toBe('Subdomínio é obrigatório.')
expect(validarSubdominio('ab')).toBe('Subdomínio deve ter de 3 a 63 caracteres: letras minúsculas, números e hífen (sem hífen no início ou no fim).')
expect(validarSubdominio('-abc')).not.toBeNull()
expect(validarSubdominio('www')).toBe('Este subdomínio é reservado.')
expect(validarSubdominio('empresa-abc')).toBeNull()
expect(normalizarSubdominio('  Empresa-ABC ')).toBe('empresa-abc')
```

- [ ] **Step 2:** `npm test -- cnpj subdominio` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test -- cnpj subdominio` → PASS.
- [ ] **Step 5: Commit** — `feat(web): CNPJ and subdomain validation mirroring the database`.

---

### Task 5: Helper `rpc()` e `ErroApp`

**Files:**
- Create: `web/shared/utils/rpc.ts`
- Test: `web/tests/unit/rpc.test.ts`

**Interfaces:**
- Produces:
  - `class ErroApp extends Error { tipo: 'regra' | 'rede' }`
  - `MENSAGEM_REDE = 'Não foi possível conectar. Tente novamente.'`
  - `rpc<T>(cliente: { rpc: (nome: string, params?: object) => PromiseLike<{ data: unknown; error: { message: string } | null }> }, nome: string, params?: object): Promise<T>`
  - Regras: `error` com mensagem de rede (`Failed to fetch`, `NetworkError`, `fetch failed`) ou exceção lançada pelo fetch → `ErroApp(MENSAGEM_REDE, 'rede')`; outro `error` → `ErroApp(error.message, 'regra')`; `data` objeto com `success === false` → `ErroApp(data.message, 'regra')`; senão retorna `data`.

- [ ] **Step 1: Testes que falham** — cliente falso com `rpc` retornando cada caso:

```ts
await expect(rpc(fake({ data: { success: true, id_empresa: 1 } }), 'x')).resolves.toEqual({ success: true, id_empresa: 1 })
await expect(rpc(fake({ data: [{ id: 1 }] }), 'x')).resolves.toEqual([{ id: 1 }])
await expect(rpc(fake({ data: { success: false, message: 'CNPJ inválido.' } }), 'x')).rejects.toMatchObject({ message: 'CNPJ inválido.', tipo: 'regra' })
await expect(rpc(fake({ error: { message: 'Você não possui permissão para visualizar os usuários desta empresa.' } }), 'x')).rejects.toMatchObject({ tipo: 'regra' })
await expect(rpc(fake({ error: { message: 'TypeError: Failed to fetch' } }), 'x')).rejects.toMatchObject({ message: MENSAGEM_REDE, tipo: 'rede' })
await expect(rpc(fakeThrow(new TypeError('fetch failed')), 'x')).rejects.toMatchObject({ tipo: 'rede' })
```

- [ ] **Step 2:** `npm test -- rpc` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test -- rpc` → PASS.
- [ ] **Step 5: Commit** — `feat(web): rpc helper with pt-BR error mapping`.

---

### Task 6: Tenant no SSR + tema + validação da sessão compartilhada

**Files:**
- Create: `web/shared/types/app.ts`, `web/server/middleware/tenant.ts`, `web/app/plugins/tenant.ts`, `web/app/composables/useTenant.ts`, `web/app/error.vue`
- Modify: `web/app/app.vue`

**Interfaces:**
- Consumes: `analisarHost`, `montarUrlEmpresa`, `montarUrlRaiz` (Task 2), `gerarVariaveisTema`, `estiloTema` (Task 3).
- Produces:
  - `web/shared/types/app.ts`: `type EmpresaTenant = { id_empresa: number; nome: string; logo: string | null; cor_primaria: string | null; cor_secundaria: string | null; subdominio: string | null }`; `type Tenant = { contexto: 'raiz' } | { contexto: 'empresa'; empresa: EmpresaTenant } | { contexto: 'desconhecido' }`.
  - `event.context.tenant: Tenant`.
  - `useTenant(): { tenant: Ref<Tenant>; ehRaiz: ComputedRef<boolean>; empresa: ComputedRef<EmpresaTenant | null>; urlLogo: ComputedRef<string | null>; urlDaEmpresa(slug: string, caminho?: string): string; urlDaRaiz(caminho?: string): string; aplicarCores(cores: { cor_primaria: string | null; cor_secundaria: string | null }): void }` — `urlLogo` = URL pública do bucket `logos` (`${SUPABASE_URL}/storage/v1/object/public/logos/${logo}`); `aplicarCores` atualiza o tema no cliente (usado na Task 14).

- [ ] **Step 1:** Server middleware: `analisarHost(getRequestHost(event), baseDomain)`; `raiz` → `{ contexto: 'raiz' }` sem banco; `invalido` → `desconhecido`; demais → `createClient(url, key).rpc('resolver_tenant', { p_host: hostBanco })`, 0 linhas → `desconhecido`. Cache `Map<hostBanco, { valor, expira }>` com TTL 60 s.
- [ ] **Step 2:** Plugin: no servidor copia `event.context.tenant` para `useState('tenant')`. `app.vue`: `useHead` com `htmlAttrs.style = estiloTema(gerarVariaveisTema(...))` e `title` = nome da empresa ou `appName`; se `contexto === 'desconhecido'`, `showError({ statusCode: 404, statusMessage: 'Empresa não encontrada' })`.
- [ ] **Step 3:** `error.vue`: card central (tokens do `design.md`) com título, mensagem e link "Ir para a página inicial" → `urlDaRaiz('/')`.
- [ ] **Step 4: Verificar tenant** — criar empresa de teste pelo SQL Editor via MCP (`criar_empresa` exige usuário: inserir direto como `postgres` em `empresas` + `empresa_dominios` com `slug = 'demo-ui'`, `cor_primaria = '#AA0000'`; registrar no `PROJETO.md` que é dado de teste). Então:
  - `curl -s -H "Host: demo-ui.localhost:3000" http://localhost:3000/ | grep -o 'brand-700:#AA0000'` → encontra.
  - `curl -s -o /dev/null -w "%{http_code}" -H "Host: naoexiste.localhost:3000" http://localhost:3000/` → `404`.
  - `curl -s -H "Host: localhost:3000" http://localhost:3000/ | grep -c 'brand-700'` → `0`.
- [ ] **Step 5: Verificar sessão compartilhada (risco da spec)** — subir com `NUXT_PUBLIC_BASE_DOMAIN=lvh.me NUXT_PUBLIC_COOKIE_DOMAIN=.lvh.me npm run dev`; página temporária `pages/_sessao.vue` mostrando `useSupabaseUser()?.email` e um botão de login com usuário de teste. Logar em `http://lvh.me:3000/_sessao`, abrir `http://demo-ui.lvh.me:3000/_sessao` → mostra o mesmo e-mail. Se falhar: parar e reportar ao responsável (alternativa `@supabase/ssr` manual). Remover `_sessao.vue` antes do commit.
- [ ] **Step 6: Commit** — `feat(web): resolve tenant on SSR and apply company theme`.

---

### Task 7: Migration `storage_logos`

**Files:**
- Create: `supabase/migrations/<versão remota>_storage_logos.sql`
- Modify: `web/shared/types/database.ts` (regerar)

**Interfaces:**
- Produces: bucket `logos`; RPC `solicitar_acesso_empresa_por_id(p_id_empresa bigint) returns json` (`{ success, message }`, mesmas mensagens de `solicitar_acesso_empresa`; empresa inexistente ou inativa → `'Empresa não encontrada.'`).

- [ ] **Step 1:** Escrever SQL: `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('logos', 'logos', true, 1048576, array['image/png','image/jpeg','image/svg+xml','image/webp'])`; policies `admin_insere_logo` / `admin_atualiza_logo` / `admin_remove_logo` em `storage.objects` `to authenticated`, condição `bucket_id = 'logos' and (storage.foldername(name))[1] ~ '^[0-9]+$' and public.usuario_admin_empresa(((storage.foldername(name))[1])::bigint)` (UPDATE com `using` e `with check`); RPC nova (security definer, `search_path ''`, revoke de `public, anon`, grant `authenticated`).
- [ ] **Step 2: Teste a seco** (migration + DO block + `raise exception 'RESULT ...'`, como em `branding_dominios`). Casos: admin envia `<id>/logo.png` → ok; admin envia `<outro_id>/logo.png` → negado; não-admin → negado; caminho `abc/logo.png` → negado; `solicitar_acesso_empresa_por_id` cria pendente `tecnico`, repetir → `'Você já possui uma solicitação ou vínculo com esta empresa.'`, id inexistente → `'Empresa não encontrada.'`, anon sem EXECUTE. Esperado: `fail=0`. Confirmar banco intacto depois.
- [ ] **Step 3:** Aplicar com `apply_migration` (nome `storage_logos`), renomear arquivo local para a versão de `list_migrations`, rodar advisors (só avisos esperados), regerar tipos.
- [ ] **Step 4: Commit** — `feat(db): logos bucket and access request by company id` (inclui `PROJETO.md` seção 6: tabela de migrations, funções, buckets).

---

### Task 8: Componentes base

**Files:**
- Create em `web/app/components/`: `AppCard.vue`, `KeyValueRow.vue`, `StatusBadge.vue`, `AppTabs.vue`, `AppButton.vue`, `FormField.vue`, `TextInput.vue`, `SelectInput.vue`, `AppToast.vue`, `ConfirmDialog.vue`, `EmptyState.vue`, `AppAvatar.vue`, `BrandLogo.vue`, `AuthCard.vue`; `web/app/composables/useToast.ts`
- Modify: `design.md` (seção 6: componentes novos; seção 12)

**Interfaces:**
- Produces (props/eventos):
  - `AppCard { titulo?: string }` slots `acao`, default.
  - `KeyValueRow { rotulo: string; valor?: string }` slot default.
  - `StatusBadge { variante: 'success' | 'danger' | 'info' | 'warning' | 'neutro'; texto: string }`.
  - `AppTabs { abas: { id: string; rotulo: string; contador?: number }[] }` + `v-model` (id).
  - `AppButton { variante?: 'primario' | 'secundario' | 'perigo' | 'link'; carregando?: boolean; type?: 'button' | 'submit'; disabled?: boolean }`.
  - `FormField { rotulo: string; erro?: string | null; ajuda?: string }`; `TextInput` / `SelectInput` com `v-model`, `SelectInput { opcoes: { valor: string; rotulo: string }[] }`.
  - `useToast(): { toasts: Ref<Toast[]>; sucesso(msg: string): void; erro(msg: string): void }`, toast some em 5 s; `AppToast` renderiza a lista (montado em `app.vue`).
  - `ConfirmDialog { aberto: boolean; titulo: string; mensagem?: string; textoConfirmar?: string; variante?: 'primario' | 'perigo'; carregando?: boolean }` eventos `confirmar`, `cancelar`; slot default para campos extras (aprovar usuário).
  - `EmptyState { titulo: string; mensagem?: string }` slot `acoes`.
  - `AppAvatar { nome: string; foto?: string | null; tamanho?: number }` (iniciais com até 2 letras).
  - `BrandLogo { tamanho?: number }` — logo do tenant (`useTenant().urlLogo`) ou hexágono `brand-900` padrão.
  - `AuthCard { titulo: string; subtitulo?: string }` — card 400 px centralizado, `BrandLogo` + nome (empresa ou `appName`) no topo.
- Estilos exatos: `design.md` seções 4 e 6 (raio card 4 px, badge 2 px, borda `border`, sombra `shadow-card`, inputs altura 40 px).

- [ ] **Step 1:** Implementar componentes.
- [ ] **Step 2: Verificar** — página temporária `pages/_componentes.vue` com todas as variantes; conferir no navegador contra `design_modelo.png` (badge "Full Service"/"Expired"/"In Progress", card com "Editar", abas). `npm run build` sem erro. Remover a página antes do commit.
- [ ] **Step 3: Commit** — `feat(web): base UI components from design system` (inclui `design.md`).

---

### Task 9: Regras de acesso, vínculos e middleware

**Files:**
- Create: `web/shared/utils/acesso.ts`, `web/app/composables/useMinhasEmpresas.ts`, `web/app/middleware/acesso.global.ts`, `web/app/layouts/publico.vue`
- Modify: `web/shared/types/app.ts`
- Test: `web/tests/unit/acesso.test.ts`

**Interfaces:**
- Consumes: `Tenant` (Task 6), `rpc` (Task 5).
- Produces:
  - `type Vinculo = { id_empresa: number; nome: string; logo: string | null; subdominio: string | null; tipo_acesso: 'administrador' | 'supervisor' | 'tecnico'; aprovado: boolean; ativo: boolean; empresa_ativa: boolean }` (linha de `listar_minhas_empresas`).
  - `situacaoVinculo(v: Vinculo | null): 'nenhum' | 'pendente' | 'desativado' | 'ativo'` (`ativo` = aprovado && ativo && empresa_ativa; `pendente` = !aprovado; demais = `desativado`).
  - `ROTAS_PUBLICAS = ['/login', '/cadastro', '/recuperar-senha', '/redefinir-senha']`, `ROTAS_RAIZ = ['/empresas', '/empresas/nova', '/empresas/solicitar']`, `ROTAS_EMPRESA = ['/', '/sem-acesso', '/usuarios', '/configuracoes']`, `ROTAS_ADMIN = ['/usuarios', '/configuracoes']`.
  - `type Decisao = { acao: 'liberar' } | { acao: 'redirecionar'; para: string; aviso?: string } | { acao: 'nao-encontrado' }`
  - `decidirAcesso(e: { rota: string; logado: boolean; contexto: 'raiz' | 'empresa'; vinculo: Vinculo | null }): Decisao`
  - `redirectSeguro(valor: unknown): string | null` — só caminhos internos começando com `/` e sem `//` nem `\`.
  - `type Destino = { tipo: 'interno'; caminho: string } | { tipo: 'empresa'; slug: string }`
  - `destinoAposLogin(e: { contexto: 'raiz' | 'empresa'; vinculos: Vinculo[]; redirect: unknown }): Destino` — empresa: `redirectSeguro(redirect) ?? '/'`; raiz: exatamente um vínculo `ativo` com subdomínio → `empresa`, senão `redirectSeguro(redirect) ?? '/empresas'`.
  - `useMinhasEmpresas(): { vinculos: Ref<Vinculo[] | null>; carregar(): Promise<Vinculo[]>; recarregarVinculos(): Promise<Vinculo[]>; vinculoDaEmpresa(id: number): Vinculo | null }` — `carregar` usa cache em `useState('vinculos')`; `recarregarVinculos` força nova consulta; limpo no logout.
  - `layouts/publico.vue`: fundo `bg-app`, conteúdo centralizado.

- [ ] **Step 1: Testes que falham**

```ts
const ativo = { id_empresa: 1, nome: 'ABC', logo: null, subdominio: 'abc', tipo_acesso: 'tecnico', aprovado: true, ativo: true, empresa_ativa: true } as const
const admin = { ...ativo, tipo_acesso: 'administrador' } as const
const pendente = { ...ativo, aprovado: false }
const desativado = { ...ativo, ativo: false }
expect(decidirAcesso({ rota: '/login', logado: false, contexto: 'empresa', vinculo: null })).toEqual({ acao: 'liberar' })
expect(decidirAcesso({ rota: '/login', logado: true, contexto: 'raiz', vinculo: null })).toEqual({ acao: 'redirecionar', para: '/empresas' })
expect(decidirAcesso({ rota: '/usuarios', logado: false, contexto: 'empresa', vinculo: null })).toEqual({ acao: 'redirecionar', para: '/login?redirect=%2Fusuarios' })
expect(decidirAcesso({ rota: '/', logado: true, contexto: 'raiz', vinculo: null })).toEqual({ acao: 'redirecionar', para: '/empresas' })
expect(decidirAcesso({ rota: '/usuarios', logado: true, contexto: 'raiz', vinculo: null })).toEqual({ acao: 'nao-encontrado' })
expect(decidirAcesso({ rota: '/empresas', logado: true, contexto: 'empresa', vinculo: ativo })).toEqual({ acao: 'nao-encontrado' })
expect(decidirAcesso({ rota: '/', logado: true, contexto: 'empresa', vinculo: null })).toEqual({ acao: 'redirecionar', para: '/sem-acesso' })
expect(decidirAcesso({ rota: '/usuarios', logado: true, contexto: 'empresa', vinculo: pendente })).toEqual({ acao: 'redirecionar', para: '/sem-acesso' })
expect(decidirAcesso({ rota: '/', logado: true, contexto: 'empresa', vinculo: desativado })).toEqual({ acao: 'redirecionar', para: '/sem-acesso' })
expect(decidirAcesso({ rota: '/usuarios', logado: true, contexto: 'empresa', vinculo: ativo })).toEqual({ acao: 'redirecionar', para: '/', aviso: 'Acesso restrito a administradores.' })
expect(decidirAcesso({ rota: '/usuarios', logado: true, contexto: 'empresa', vinculo: admin })).toEqual({ acao: 'liberar' })
expect(decidirAcesso({ rota: '/sem-acesso', logado: true, contexto: 'empresa', vinculo: null })).toEqual({ acao: 'liberar' })
expect(decidirAcesso({ rota: '/sem-acesso', logado: true, contexto: 'empresa', vinculo: ativo })).toEqual({ acao: 'redirecionar', para: '/' })
expect(redirectSeguro('https://evil.com')).toBeNull()
expect(redirectSeguro('//evil.com')).toBeNull()
expect(redirectSeguro('/usuarios')).toBe('/usuarios')
expect(destinoAposLogin({ contexto: 'raiz', vinculos: [ativo], redirect: null })).toEqual({ tipo: 'empresa', slug: 'abc' })
expect(destinoAposLogin({ contexto: 'raiz', vinculos: [ativo, { ...ativo, id_empresa: 2, subdominio: 'xyz' }], redirect: null })).toEqual({ tipo: 'interno', caminho: '/empresas' })
expect(destinoAposLogin({ contexto: 'raiz', vinculos: [pendente], redirect: null })).toEqual({ tipo: 'interno', caminho: '/empresas' })
expect(destinoAposLogin({ contexto: 'empresa', vinculos: [], redirect: 'https://evil.com' })).toEqual({ tipo: 'interno', caminho: '/' })
```

- [ ] **Step 2:** `npm test -- acesso` → FAIL.
- [ ] **Step 3:** Implementar `acesso.ts`; middleware global: `contexto 'desconhecido'` → deixa o erro da Task 6; obtém `logado` de `useSupabaseUser()`, vínculo via `useMinhasEmpresas().carregar()` só quando logado e em subdomínio; aplica `Decisao` (`navigateTo`, `showError({ statusCode: 404 })`, aviso via `useToast().erro`).
- [ ] **Step 4:** `npm test -- acesso` → PASS; `npm run build` sem erro.
- [ ] **Step 5: Commit** — `feat(web): access rules, membership cache and global route middleware`.

---

### Task 10: Telas de autenticação

**Files:**
- Create: `web/app/pages/login.vue`, `cadastro.vue`, `recuperar-senha.vue`, `redefinir-senha.vue`
- Modify: `design.md` (seção 11: Login/cadastro ✅ derivado), `PROJETO.md`

**Interfaces:**
- Consumes: `AuthCard`, `FormField`, `TextInput`, `AppButton`, `useToast` (Task 8); `useMinhasEmpresas().recarregarVinculos`, `destinoAposLogin` (Task 9); `useTenant().urlDaEmpresa` (Task 6).

- [ ] **Step 1:** `login.vue` (layout `publico`): e-mail, senha → `signInWithPassword`; erro `Invalid login credentials` → `E-mail ou senha incorretos.`; `Email not confirmed` → `Confirme seu e-mail antes de entrar.`; sucesso → `recarregarVinculos()` → `destinoAposLogin` → `navigateTo(caminho)` ou `navigateTo(urlDaEmpresa(slug), { external: true })`. Links "Esqueci minha senha" e "Criar conta".
- [ ] **Step 2:** `cadastro.vue`: nome, e-mail, senha (mín. 8), confirmação → `signUp({ email, password, options: { data: { nome }, emailRedirectTo: <origem>/login } })`. Sem sessão no retorno → mensagem `Enviamos um link de confirmação para <e-mail>.`; com sessão → mesmo fluxo de destino do login. Conferir em `handle_new_user` (baseline) qual chave de metadata vira `users.nome` e usar a mesma.
- [ ] **Step 3:** `recuperar-senha.vue` → `resetPasswordForEmail(email, { redirectTo: <origem>/redefinir-senha })`, mensagem neutra `Se o e-mail estiver cadastrado, você receberá um link.`; `redefinir-senha.vue` → `updateUser({ password })`, depois `/login` com toast de sucesso.
- [ ] **Step 4: Verificar** no navegador (`localhost:3000` e `demo-ui.localhost:3000`): login errado mostra mensagem; cadastro de usuário novo; login válido na raiz sem vínculos → `/empresas`; logo/cores da `demo-ui` no login do subdomínio.
- [ ] **Step 5: Commit** — `feat(web): login, sign-up and password recovery pages`.

---

### Task 11: Telas da raiz (minhas empresas, criar, solicitar)

**Files:**
- Create: `web/app/pages/empresas/index.vue`, `empresas/nova.vue`, `empresas/solicitar.vue`
- Modify: `design.md` (seção 11: Onboarding ✅ derivado), `PROJETO.md`

**Interfaces:**
- Consumes: `rpc` (Task 5); `mascararCnpj`, `cnpjValido`, `normalizarSubdominio`, `validarSubdominio` (Task 4); `situacaoVinculo`, `useMinhasEmpresas` (Task 9); `useTenant().urlDaEmpresa`; componentes da Task 8.

- [ ] **Step 1:** `empresas/index.vue`: cards por vínculo (logo, nome, `<subdominio>.<base>`, `StatusBadge`: ativo → success "Ativo"; pendente → warning "Aguardando aprovação"; desativado → danger "Desativado"); "Entrar" só para ativo (navegação externa). Botões "Criar empresa", "Entrar em uma empresa", "Sair". Sem vínculos → `EmptyState` "Você ainda não participa de nenhuma empresa."
- [ ] **Step 2:** `empresas/nova.vue`: razão social, nome fantasia, CNPJ (máscara + `cnpjValido` → erro `CNPJ inválido.`), matrícula, subdomínio (normaliza ao digitar; `validarSubdominio` local; se válido, `verificar_subdominio` com debounce 400 ms; mostra prévia `abc.<base>` e "Disponível"/mensagem). Enviar → `rpc('criar_empresa', { p_razao_social, p_nome_fantasia, p_cnpj, p_matricula, p_subdominio })` → `recarregarVinculos()` → `navigateTo(urlDaEmpresa(subdominio), { external: true })`.
- [ ] **Step 3:** `empresas/solicitar.vue`: CNPJ → `rpc('solicitar_acesso_empresa', { p_cnpj })` → toast com a mensagem do banco → `recarregarVinculos()` → `/empresas`.
- [ ] **Step 4: Verificar** no navegador: criar empresa com subdomínio já usado (`demo-ui`) → "Subdomínio já está em uso."; criar `minha-empresa` → cai em `minha-empresa.localhost:3000` (em dev a sessão não é compartilhada entre hosts `localhost` — logar de novo é esperado; com `lvh.me` deve entrar direto). Segundo usuário solicita por CNPJ → aparece "Aguardando aprovação".
- [ ] **Step 5: Commit** — `feat(web): company list, creation and access request pages`.

---

### Task 12: Layout do app, Início e sem acesso

**Files:**
- Create: `web/app/components/AppSidebar.vue`, `AppTopbar.vue`, `BottomNav.vue`, `web/app/layouts/default.vue`, `web/app/pages/index.vue`, `web/app/pages/sem-acesso.vue`, `web/app/composables/useEmpresaAtual.ts`, `web/shared/utils/menu.ts`
- Modify: `design.md` (seções 10 e 11), `PROJETO.md`

**Interfaces:**
- Consumes: `useTenant`, `useMinhasEmpresas`, `situacaoVinculo`, componentes da Task 8, `rpc`.
- Produces:
  - `menu.ts`: `type ItemMenu = { id: string; rotulo: string; icone: string; rota: string | null; somenteAdmin?: boolean }`; `ITENS_MENU` na ordem do `design.md` seção 7 (Início `/`, Equipamentos, Ordens de Serviço, Preventivas / Agenda, Clientes e Unidades, Categorias e Tipos, Fabricantes, Checklists, Relatórios — módulos futuros com `rota: null` = "em breve") + `Usuários` `/usuarios` e `Configurações` `/configuracoes` (`somenteAdmin`); `ITENS_BOTTOM_NAV` = Início, O.S., Agenda, Clientes, Mais.
  - `useEmpresaAtual(): { vinculo: ComputedRef<Vinculo | null>; ehAdmin: ComputedRef<boolean> }`.
- Layout: sidebar 196 px em `lg:` (≥ 1024 px); abaixo disso, `BottomNav` fixa e sidebar oculta; "Mais" abre folha com os demais itens + Sair. Rodapé da sidebar: `AppAvatar`, nome do usuário, papel (`Administrador`/`Supervisor`/`Técnico`), menu com "Minhas empresas" (`urlDaRaiz('/empresas')`) e "Sair" (`signOut`, limpa vínculos, vai a `/login`). Topbar: busca desabilitada.

- [ ] **Step 1:** Implementar menu, layout e componentes.
- [ ] **Step 2:** `index.vue`: card de boas-vindas (nome, papel, empresa) + cards "em breve" dos módulos.
- [ ] **Step 3:** `sem-acesso.vue` (layout `publico`), textos exatos da spec 5.5 conforme `situacaoVinculo`; "Solicitar acesso" → `rpc('solicitar_acesso_empresa_por_id', { p_id_empresa })` → `recarregarVinculos()` → mostra estado pendente.
- [ ] **Step 4: Verificar** no navegador: admin vê Usuários/Configurações; técnico não; itens "em breve" desabilitados; viewport 390 px mostra bottom nav; usuário sem vínculo em `demo-ui.localhost` vê aviso e consegue solicitar; pendente vê "aguardando aprovação".
- [ ] **Step 5: Commit** — `feat(web): app layout, home and no-access page`.

---

### Task 13: Gestão de usuários

**Files:**
- Create: `web/app/pages/usuarios.vue`, `web/app/composables/useUsuariosEmpresa.ts`
- Modify: `web/shared/types/app.ts`, `design.md` (seção 11), `PROJETO.md`

**Interfaces:**
- Consumes: `rpc`, `useEmpresaAtual`, `useMinhasEmpresas().recarregarVinculos`, componentes da Task 8.
- Produces:
  - `type UsuarioEmpresa` = linha de `listar_usuarios_empresa` (`id_usuario`, `nome`, `email`, `foto`, `matricula`, `tipo_acesso`, `aprovado`, `ativo`, `data_solicitacao`, `data_aprovacao`).
  - `useUsuariosEmpresa(idEmpresa: number): { usuarios: Ref<UsuarioEmpresa[]>; carregando: Ref<boolean>; carregar(); aprovar(idUsuario: string, tipoAcesso: string, matricula: string); rejeitar(idUsuario: string); alterarPapel(idUsuario: string, tipoAcesso: string); desativar(idUsuario: string); reativar(idUsuario: string) }` — cada ação chama a RPC correspondente (`aprovar_usuario`, `rejeitar_usuario`, `alterar_papel_usuario`, `desativar_usuario`, `reativar_usuario` com `p_id_empresa`, `p_id_usuario`, …), mostra toast com a `message` do banco, recarrega a lista **e** `recarregarVinculos()` (o admin pode ter alterado o próprio acesso).

- [ ] **Step 1:** Implementar composable e página: `AppTabs` Ativos · Pendentes (contador) · Desativados; linhas com `AppAvatar`, nome, e-mail, matrícula, papel; ações por aba conforme spec 7.4; `ConfirmDialog` para cada ação (aprovar com `SelectInput` papel + `TextInput` matrícula obrigatória; rejeitar/desativar com variante `perigo`).
- [ ] **Step 2: Verificar** no navegador com 2 usuários: aprovar pendente com papel `tecnico` e matrícula; matrícula repetida → mensagem do banco; desativar o único admin → mensagem do banco; reativar; o técnico aprovado entra no subdomínio e vê o layout sem Usuários/Configurações.
- [ ] **Step 3: Commit** — `feat(web): company user management page`.

---

### Task 14: Configurações da empresa

**Files:**
- Create: `web/app/pages/configuracoes.vue`, `web/app/components/config/ConfigDados.vue`, `ConfigIdentidade.vue`, `ConfigDominio.vue`
- Modify: `design.md` (seção 11), `PROJETO.md`

**Interfaces:**
- Consumes: `useTenant().aplicarCores`, `useTenant().urlDaEmpresa`, `rpc`, `validarSubdominio`, `normalizarSubdominio`, `useEmpresaAtual`, componentes da Task 8.

- [ ] **Step 1:** `ConfigDados`: carrega `empresas` (select por `id`); edita `razao_social`, `nome_fantasia`, `email`, `telefone`, `site`, `responsavel`, `endereco`, `numero`, `complemento`, `bairro`, `cidade`, `estado`, `cep`; CNPJ só leitura com `mascararCnpj`; salva com `update` direto.
- [ ] **Step 2:** `ConfigIdentidade`: upload (`input type=file`, aceita png/jpg/svg/webp, recusa > 1 MB no cliente com `A logo deve ter no máximo 1 MB.`) → `storage.from('logos').upload('<id>/logo.<ext>', file, { upsert: true })`, remove arquivo antigo de outra extensão, `update empresas set logo`; remover logo → apaga arquivo + `logo = null`. Cores: `input type=color` + campo hex; prévia ao vivo via `aplicarCores`; salvar → `update` de `cor_primaria`/`cor_secundaria`; "Restaurar padrão" → `null`.
- [ ] **Step 3:** `ConfigDominio`: mostra `<subdominio>.<base>`; alterar → `ConfirmDialog` (`Links antigos deixam de funcionar.`) → `rpc('alterar_subdominio', ...)` → `navigateTo(urlDaEmpresa(novo, '/configuracoes'), { external: true })`.
- [ ] **Step 4: Verificar** no navegador: trocar cor muda sidebar/botões na hora e persiste após recarregar (até 60 s de cache SSR); logo aparece na sidebar e no login do subdomínio; arquivo de 2 MB recusado; não-admin não chega à página; alterar subdomínio redireciona e o antigo dá "Empresa não encontrada".
- [ ] **Step 5: Commit** — `feat(web): company settings (data, branding, subdomain)`.

---

### Task 15: Fechamento

**Files:**
- Modify: `PROJETO.md` (checklist Fase 2, seção 2 com estrutura `web/`, histórico), `design.md` (histórico), `web/README.md` (criar: como rodar, variáveis, `*.localhost`, `lvh.me`)

- [ ] **Step 1:** Remover dados de teste do banco (empresa `demo-ui` e usuários de teste) **somente com confirmação do responsável**.
- [ ] **Step 2: Verificar** — `npm test` (todos passam), `npm run build` sem erro, roteiro manual completo da spec seção 10 em `lvh.me` (inclui sessão compartilhada raiz ↔ subdomínio).
- [ ] **Step 3: Commit** — `docs: close frontend base phase`.
