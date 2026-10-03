# Spec — Frontend base (Fase 2)

- **Data:** 2026-10-03
- **Status:** aguardando revisão do responsável
- **Subprojeto:** 1 de 5 (Frontend base → Cadastros → Checklists → Ordens de Serviço → Gestão)
- **Referências:** `PROJETO.md` (escopo, banco, decisões), `design.md` (tokens e componentes), `design_modelo.png`

---

## 1. Objetivo

Entregar a base do frontend Nuxt sobre o backend multi-tenant já existente: identidade visual por empresa (tenant), autenticação, onboarding, escolha de empresa, gestão de usuários e configurações da empresa. Os próximos subprojetos (cadastros, checklists, O.S., gestão) reutilizam layout, autenticação, tema e componentes daqui.

### Critérios de sucesso

1. `manutgo.otimetech.com.br` (raiz) mostra login com marca padrão; `abc.manutgo.otimetech.com.br` mostra login com logo e cores da empresa `abc`, já no HTML do servidor (sem flash de tema).
2. Um usuário novo cria conta, cria empresa escolhendo o subdomínio e é levado ao subdomínio já logado.
3. Outro usuário solicita acesso por CNPJ, vê "aguardando aprovação"; o admin aprova com papel e matrícula; o usuário passa a entrar no subdomínio.
4. Logar na raiz vale para os subdomínios (e vice-versa).
5. Usuário sem vínculo ativo que abre um subdomínio vê a tela de aviso com opções.
6. Admin altera dados, logo, cores e subdomínio da empresa; o tema muda.
7. Layout desktop (sidebar + topbar) e mobile (bottom navigation) seguem o `design.md`.

### Decisões do responsável (2026-10-03)

- Começar pelo frontend base, usando o backend existente.
- Login na raiz **e** no subdomínio; sessão compartilhada entre eles.
- Subdomínio sem vínculo ativo: tela de aviso + opções (não redireciona automaticamente).
- Telas sem modelo visual são derivadas dos tokens do `design.md` e registradas nele; aprovação ao ver rodando.
- Integração via módulo `@nuxtjs/supabase`.
- Infra (DNS wildcard, certificado, Redirect URLs do Auth, P8) fica para depois; desenvolvimento local com `*.localhost`.

---

## 2. Stack e estrutura

| Item | Escolha |
|---|---|
| Framework | Nuxt 4, SSR |
| Estilo | Tailwind CSS via `@nuxtjs/tailwindcss`, tokens do `design.md` seção 9 |
| Supabase | `@nuxtjs/supabase` |
| Ícones | `lucide-vue-next` |
| Fonte | Inter (Google Fonts) |
| Testes | Vitest |
| Gerenciador | npm |
| Pasta | `web/` (separada de `supabase/` e dos documentos; Coolify faz build a partir de `web/`) |

```
web/
  app/
    assets/css/main.css        # Tailwind + variáveis CSS do tema
    components/                # componentes base (seção 6)
    composables/               # useTenant, useMinhasEmpresas, useEmpresaAtual, useUsuariosEmpresa
    layouts/                   # default (app) e publico (auth/onboarding)
    middleware/                # acesso.global.ts
    pages/                     # seção 5
    plugins/                   # tenant.ts
    utils/                     # host, tema, cnpj, subdominio, rpc (funções puras, testadas)
  server/
    middleware/tenant.ts       # resolve tenant pelo host
  types/database.ts            # gerado por supabase gen types
  tests/unit/
  nuxt.config.ts
  tailwind.config.ts
  .env.example
```

### Variáveis de ambiente

| Variável | Uso |
|---|---|
| `SUPABASE_URL`, `SUPABASE_KEY` | Projeto `hezxupksbntcwaxkmlmg`, chave publicável (anon) |
| `NUXT_PUBLIC_BASE_DOMAIN` | `manutgo.otimetech.com.br` (deve ser igual a `dominio_base()` no banco) |
| `NUXT_PUBLIC_COOKIE_DOMAIN` | `.manutgo.otimetech.com.br` em produção; vazio em dev |

---

## 3. Resolução do tenant

1. `server/middleware/tenant.ts` roda em toda requisição SSR:
   - Lê o header `host` e normaliza (minúsculas, sem porta).
   - **Dev:** host terminado em `.localhost` é traduzido para `<slug>.<NUXT_PUBLIC_BASE_DOMAIN>`; `localhost` puro é tratado como raiz.
   - Host igual ao domínio base (ou `localhost`): contexto **raiz**, sem chamada ao banco.
   - Caso contrário: chama `resolver_tenant(host)` com a chave anon. Resultado em `event.context.tenant` com `{ contexto: 'raiz' | 'empresa' | 'desconhecido', empresa?: { id_empresa, nome, logo, cor_primaria, cor_secundaria, subdominio } }`.
   - Cache em memória por host (TTL 60 s) para não consultar o banco a cada requisição.
2. `plugins/tenant.ts` copia o contexto para `useState('tenant')` (serializado no payload SSR, disponível no cliente).
3. `useTenant()` expõe `contexto`, `empresa`, `ehRaiz`, `urlDaEmpresa(subdominio)` e `urlDaRaiz(caminho)`.
4. Contexto `desconhecido` (subdomínio sem empresa ou empresa inativa) renderiza a página "Empresa não encontrada", com link para a raiz.

---

## 4. Tema por empresa

- `utils/tema.ts` gera variáveis CSS a partir do branding:
  - `cor_primaria` → `--brand-700`.
  - Derivadas via `color-mix(in srgb, ...)`: `--brand-900` (primária + 45 % preto), `--brand-600` (primária + 15 % branco), `--brand-100` (primária 22 % sobre branco), `--brand-50` (primária 8 % sobre branco), `--brand-50-border` (primária 12 % sobre branco).
  - `cor_secundaria`, se existir, substitui `--brand-600` (links e ações secundárias).
  - Sem cor definida: nenhuma variável, vale o padrão do `tailwind.config.ts`.
- As variáveis entram no `<html style="...">` via `useHead` durante o SSR. Tokens de status (verde/vermelho/laranja) nunca mudam.
- Logo: URL pública do bucket `logos`; sem logo, usa o hexágono padrão (`BrandLogo`).
- Título da aba: nome da empresa ou "ManutGO" na raiz.

---

## 5. Sessão, rotas e acesso

### 5.1 Sessão compartilhada

`@nuxtjs/supabase` com `cookieOptions.domain = NUXT_PUBLIC_COOKIE_DOMAIN`, `sameSite: 'lax'`, `secure` em produção. Logar em qualquer host da plataforma vale para todos. Redirect automático do módulo desligado (`redirect: false`); o controle é do middleware próprio.

### 5.2 Páginas

| Rota | Raiz | Subdomínio | Layout | Exige login |
|---|---|---|---|---|
| `/login` | ✅ marca padrão | ✅ marca da empresa | publico | não |
| `/cadastro` | ✅ | ✅ | publico | não |
| `/recuperar-senha` | ✅ | ✅ | publico | não |
| `/redefinir-senha` | ✅ | ✅ | publico | link do e-mail |
| `/empresas` | ✅ minhas empresas | — | publico | sim |
| `/empresas/nova` | ✅ criar empresa | — | publico | sim |
| `/empresas/solicitar` | ✅ solicitar acesso por CNPJ | — | publico | sim |
| `/sem-acesso` | — | ✅ | publico | sim |
| `/` | redireciona a `/empresas` | Início | default | sim |
| `/usuarios` | — | ✅ só administrador | default | sim |
| `/configuracoes` | — | ✅ só administrador | default | sim |

Rotas de subdomínio acessadas na raiz (e vice-versa) retornam 404.

### 5.3 Middleware `acesso.global.ts`

1. Rota pública (`/login`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`): libera; usuário já logado em `/login` vai para o destino padrão.
2. Sem sessão: `/login?redirect=<rota>`.
3. **Raiz:** libera as rotas de raiz.
4. **Subdomínio:** busca o vínculo com a empresa atual em `listar_minhas_empresas()` (cache em `useState`, recarregado após login, troca de empresa ou ações de vínculo):
   - aprovado + ativo + empresa ativa → libera; `/usuarios` e `/configuracoes` exigem `administrador` (senão volta ao Início com aviso).
   - qualquer outro caso → `/sem-acesso`.

### 5.4 Destinos após login/cadastro

- **Subdomínio:** volta para `redirect` ou `/` (o middleware leva a `/sem-acesso` se não houver vínculo ativo).
- **Raiz:** `/empresas`. Se o usuário tiver exatamente um vínculo ativo, redireciona direto para o subdomínio dessa empresa.
- Após `criar_empresa`: redireciona para `https://<subdominio>.<base>/` (dev: `http://<subdominio>.localhost:3000/`).

### 5.5 Tela `/sem-acesso`

| Situação do vínculo | Mensagem | Ações |
|---|---|---|
| Nenhum | "Você não tem acesso a <empresa>." | Solicitar acesso (chama `solicitar_acesso_empresa` com o CNPJ da empresa — ver 7.1), Minhas empresas, Sair |
| Pendente | "Sua solicitação está aguardando aprovação do administrador." | Minhas empresas, Sair |
| Desativado | "Seu acesso a <empresa> foi desativado. Fale com o administrador." | Minhas empresas, Sair |

---

## 6. Componentes

Base (seguem `design.md` seção 6; novos são registrados lá):

| Componente | Função |
|---|---|
| `AppCard`, `KeyValueRow`, `StatusBadge`, `Tabs` | Do `design.md` |
| `AppSidebar` | Sidebar 196 px, menu mapeado (`design.md` seção 7); rodapé com avatar, nome, papel e menu (Minhas empresas, Sair) |
| `AppTopbar` | Voltar + busca (busca desabilitada neste subprojeto) |
| `BottomNav` | Mobile < 1024 px: `Início | O.S. | Agenda | Clientes | Mais`; "Mais" abre folha com demais itens |
| `AppAvatar`, `BrandLogo` | Iniciais / logo do tenant ou hexágono padrão |
| `AppButton` | Variantes `primario` (fundo `brand-700`), `secundario` (borda `border`), `perigo`; estado de carregamento |
| `FormField`, `TextInput`, `SelectInput` | Rótulo `label`, campo com borda `border`, raio 4 px, mensagem de erro `danger-700` |
| `AppToast` | Sucesso (verde) e erro (vermelho), canto superior direito |
| `ConfirmDialog` | Confirmação de ações de gestão |
| `EmptyState` | Lista vazia |
| `AuthCard` | Card central 400 px sobre `bg-app`, logo no topo; usado nas telas públicas |

Itens de menu de módulos futuros (Equipamentos, O.S., Agenda, Clientes, Categorias, Fabricantes, Checklists, Relatórios) aparecem desabilitados com selo "em breve". Itens `Usuários` e `Configurações` só aparecem para administrador.

---

## 7. Telas

### 7.1 Ajuste de backend: solicitar acesso pelo subdomínio

`/sem-acesso` precisa solicitar acesso sem o usuário digitar o CNPJ. Nova RPC `solicitar_acesso_empresa_por_id(p_id_empresa)`, mesma regra de `solicitar_acesso_empresa(cnpj)` (vínculo pendente `tecnico`), para não expor o CNPJ ao frontend. Vai na mesma migration do storage (seção 8).

### 7.2 Público

- **Login:** e-mail, senha, "Esqueci minha senha", link para cadastro.
- **Cadastro:** nome, e-mail, senha, confirmação. Após cadastro com confirmação de e-mail ativa: mensagem "Confirme seu e-mail".
- **Recuperar / redefinir senha:** fluxo padrão do Supabase Auth (`resetPasswordForEmail` → `/redefinir-senha`).

### 7.3 Raiz

- **Minhas empresas:** cards com logo, nome, subdomínio e `StatusBadge` (Ativo / Aguardando aprovação / Desativado). Ativo → "Entrar" (vai ao subdomínio). Botões "Criar empresa" e "Entrar em uma empresa". Sem vínculos: `EmptyState` com os dois botões.
- **Criar empresa:** razão social, nome fantasia, CNPJ (máscara numérica/alfanumérica, validação de dígito no cliente), matrícula, subdomínio (prévia `abc.manutgo.otimetech.com.br`, checagem `verificar_subdominio` com debounce de 400 ms).
- **Solicitar acesso:** CNPJ → `solicitar_acesso_empresa`; sucesso volta a Minhas empresas com o vínculo pendente.

### 7.4 Subdomínio

- **Início:** card de boas-vindas (nome do usuário, papel, empresa) e cards "em breve" dos módulos. Dashboard real fica para a Fase 6.
- **Usuários (admin):** `Tabs` Ativos · Pendentes (com contador) · Desativados. Lista vem de `listar_usuarios_empresa`. Ações:
  - Pendente: Aprovar (diálogo com papel + matrícula → `aprovar_usuario`), Rejeitar (`rejeitar_usuario`).
  - Ativo: Alterar papel (`alterar_papel_usuario`), Desativar (`desativar_usuario`).
  - Desativado: Reativar (`reativar_usuario`).
  - Mensagens de regra (ex.: último administrador) vêm do banco.
- **Configurações (admin):** `Tabs` Dados · Identidade visual · Domínio.
  - Dados: campos editáveis de `empresas` (CNPJ só leitura). Update direto na tabela.
  - Identidade visual: upload/remoção de logo, cor principal e secundária (seletor + hex) com prévia ao vivo do tema.
  - Domínio: subdomínio atual, alteração via `alterar_subdominio` com aviso de que links antigos deixam de funcionar; após alterar, redireciona ao novo host.

---

## 8. Backend novo — migration `storage_logos`

- Bucket `logos`, público para leitura, limite 1 MB, tipos `image/png`, `image/jpeg`, `image/svg+xml`, `image/webp`.
- Caminho: `{id_empresa}/logo.<ext>`; `empresas.logo` guarda o caminho.
- Policies em `storage.objects` (bucket `logos`): INSERT, UPDATE e DELETE só quando `usuario_admin_empresa((storage.foldername(name))[1]::bigint)`. Leitura pública pelo bucket.
- RPC `solicitar_acesso_empresa_por_id(p_id_empresa bigint)` (seção 7.1), `authenticated`.
- Teste a seco antes de aplicar, como nas migrations anteriores.

---

## 9. Dados e erros

- `utils/rpc.ts`: `rpc(nome, params)` chama `supabase.rpc`; se `error` ou `success === false`, lança `ErroApp` com a `message` do banco (pt-BR). Retorno de funções `returns table` passa direto.
- Tipos gerados do banco em `types/database.ts`; cliente tipado.
- Erros:
  - RPC/validação → toast vermelho com a mensagem do banco; formulário mantém os valores.
  - Rede → "Não foi possível conectar. Tente novamente." com botão de tentar de novo.
  - Sessão expirada → `/login?redirect=...`.
  - Tenant desconhecido → página "Empresa não encontrada".

---

## 10. Testes

- **Vitest (unit)** para funções puras em `utils/`:
  - host → contexto/slug (produção, `*.localhost`, porta, raiz, multinível, domínio externo);
  - tema: cores derivadas e substituição pela secundária;
  - CNPJ: máscara e dígito verificador (numérico e alfanumérico, mesmos casos do banco);
  - subdomínio: normalização e regras (tamanho, hífen, reservados — mesma lista do banco);
  - `rpc()`: sucesso, `success: false`, erro do supabase.
- **Banco:** teste a seco da migration `storage_logos`.
- **Manual guiado** no navegador: raiz e `abc.localhost:3000`, cadastro, criar empresa, segundo usuário solicitando acesso, aprovação, desativação, troca de cores/logo/subdomínio, mobile (viewport estreita).
- Playwright fica para um subprojeto futuro.

---

## 11. Fora do escopo

- Perfil do usuário (nome, telefone, foto).
- Busca global da topbar.
- Notificações.
- Módulos de cadastro, checklists, O.S., agenda, dashboard e relatórios (só itens "em breve" no menu).
- Infra de produção: DNS wildcard, certificado, Redirect URLs do Auth, deploy no Coolify, P8.
- E-mails de auth com marca da empresa (Fase 7).

---

## 12. Riscos

| Risco | Mitigação |
|---|---|
| E-mails de confirmação/recuperação apontam para o Site URL do Supabase, não para o subdomínio | Em dev, Site URL = `http://localhost:3000`; Redirect URLs de produção entram na etapa de infra |
| `@nuxtjs/supabase` não aceitar cookie de domínio compartilhado como esperado | Validar cedo (primeira tarefa após o scaffold); alternativa: `@supabase/ssr` manual |
| `color-mix()` em navegadores antigos | Suportado nos navegadores atuais; fallback é a paleta padrão |
| Cache do tenant mostrar branding antigo após alteração | TTL de 60 s; após salvar em Configurações, o cliente aplica o tema novo na hora |
