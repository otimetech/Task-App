# TaskApp — SaaS de Gestão de Ordens de Serviço

> **Documento central do projeto.** Toda decisão, mudança de banco, funcionalidade entregue e pendência é registrada aqui.
> **Regra:** este arquivo deve ser atualizado a cada alteração no projeto (código, banco, decisão ou escopo).

- **Última atualização:** 2026-10-03
- **Responsável:** Otimetech
- **Fonte original do escopo:** `Escopo Projeto.docx`

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Stack](#2-stack)
3. [Arquitetura multi-tenant](#3-arquitetura-multi-tenant)
4. [Usuários e permissões](#4-usuários-e-permissões)
5. [Módulos funcionais (escopo)](#5-módulos-funcionais-escopo)
6. [Banco de dados — estado atual](#6-banco-de-dados--estado-atual)
7. [Banco de dados — modelo planejado](#7-banco-de-dados--modelo-planejado)
8. [Problemas conhecidos](#8-problemas-conhecidos)
9. [Decisões](#9-decisões)
10. [Decisões pendentes](#10-decisões-pendentes)
11. [Checklist](#11-checklist)
12. [Histórico de alterações](#12-histórico-de-alterações)

---

## 1. Visão geral

Plataforma SaaS para empresas prestadoras de serviços de manutenção, inspeção, instalação e assistência técnica gerenciarem todo o ciclo de uma atividade:

```
Solicitação → Planejamento → Execução → Evidências → Assinatura → Relatório PDF → Histórico
```

Experiência responsiva, com foco distinto por dispositivo:

- **Mobile:** técnico/executor em campo. Interface pensada para o campo, não uma versão desktop encolhida. Navegação inferior: `Início | O.S. | Agenda | Clientes | Mais`.
- **Desktop:** gestores — planejamento, cadastros, acompanhamento, dashboards e relatórios. Layout: menu lateral + topbar + área de conteúdo.

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Nuxt.js (Vue) |
| Estilo | Tailwind CSS (`@nuxtjs/tailwindcss`) |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions, RLS) |
| Projeto Supabase | `hezxupksbntcwaxkmlmg` |
| Repositório | https://github.com/otimetech/Task-App (branch `main`) |
| Hospedagem frontend | VPS própria com Coolify |
| Renderização | SSR (Nuxt server resolve o tenant pelo host) |
| Domínio base | `manutgo.otimetech.com.br` (empresas em `<subdominio>.manutgo.otimetech.com.br`) |
| Código do frontend | `web/` (Nuxt 4). Como rodar, variáveis e estrutura: [`web/README.md`](web/README.md) |

> Flutter foi descartado (2026-09-29). O resumo do backend no `.docx` ainda cita Flutter; vale o Nuxt.

### Identidade visual

**Fonte oficial: [`design.md`](design.md)** (tokens, componentes, layout), baseado no modelo [`design_modelo.png`](design_modelo.png). A interface deve seguir o modelo exatamente.

Resumo: fundo `#EEF0F2`, cards brancos com borda sutil, cor de marca azul petróleo (`#004E61` / `#266478`), status verde/vermelho/laranja, fonte Inter, sidebar fixa + grid de 3 colunas no desktop. Cada empresa-tenant pode sobrescrever logo e a família `brand-*` de cores (ver seção 3).

> A paleta azul `#2563EB` do escopo original foi substituída pela paleta do modelo (2026-09-29).

---

## 3. Arquitetura multi-tenant

**Modelo:** um único banco Supabase compartilhado. Cada empresa (tenant) tem seus dados isolados por `id_empresa` + políticas RLS, e seu próprio domínio/subdomínio com identidade visual própria.

```
manutgo.otimetech.com.br       ─┐  (raiz: login geral + onboarding, marca padrão)
abc.manutgo.otimetech.com.br   ─┼─► mesmo frontend Nuxt (1 deploy) ─► mesmo Supabase (1 projeto)
os.xyz.com.br (Fase 7)         ─┘          │                                  │
                     resolve tenant pelo host             RLS isola por id_empresa
                     (apenas branding)                    (segurança real)
```

### Princípios

1. **Domínio define só a aparência** (logo, cores, nome). Nunca define acesso a dados.
2. **Acesso é definido pelo vínculo** em `empresa_usuarios` (aprovado + ativo), verificado via RLS.
3. **Toda tabela operacional possui `id_empresa`**, com RLS usando `usuario_pertence_empresa(id_empresa)`.
4. **FKs compostas** `(id_empresa, id_x)` impedem que um registro de uma empresa referencie registro de outra.
5. **Índices começam por `id_empresa`** nas tabelas operacionais.
6. **Storage** organizado por prefixo `{id_empresa}/...`, com policies em `storage.objects`.
7. **Um usuário pode pertencer a várias empresas** (tabela `empresa_usuarios` N:N). O mesmo e-mail é a mesma conta em todos os tenants.

### Resolução do tenant pelo domínio

- **Banco: implementado (2026-10-03).** Tabela `empresa_dominios` (`id_empresa`, `dominio` único e minúsculo, `tipo` subdominio/proprio, `verificado`, `principal`).
  - `tipo = 'subdominio'`: `dominio` guarda só o slug (ex.: `abc`). Um por empresa, escolhido pelo admin ao criar a empresa; alterável via `alterar_subdominio`.
  - `tipo = 'proprio'`: `dominio` guarda o host completo (Fase 7).
- RPC pública `resolver_tenant(p_host)` executável por `anon`, retornando **apenas** branding (`id_empresa`, nome, logo, cores, subdomínio). Domínio raiz ou host desconhecido: nenhuma linha (marca padrão).
- Domínio raiz `manutgo.otimetech.com.br`: login geral + onboarding; após login, `listar_minhas_empresas()` permite escolher a empresa e redirecionar ao subdomínio.
- Nuxt (SSR) resolve o host no servidor (middleware/plugin) e aplica o tema — Fase 2.

### Limitações do Supabase a considerar

- **Auth único por projeto:** templates de e-mail e SMTP são globais. Para e-mails com marca de cada empresa: Send Email Hook + Edge Function.
- **Redirect URLs:** cada domínio próprio precisa estar na allowlist do Auth. Subdomínios aceitam wildcard (`https://*.manutgo.otimetech.com.br/**`). Domínios próprios: automatizar via Management API ou centralizar o login em um domínio.
- **Domínio customizado da API Supabase:** um por projeto. A API permanece em endereço único; só o frontend usa domínios por tenant.
- **Subdomínios (fase inicial):** DNS wildcard `*.manutgo.otimetech.com.br` apontando para a VPS; Coolify (Traefik) com certificado wildcard via desafio DNS do Let's Encrypt.
- **SSL de domínios próprios (Fase 7):** Traefik/Coolify emite certificado por domínio (desafio HTTP). A empresa cria um CNAME, o sistema verifica e marca `verificado = true`.

---

## 4. Usuários e permissões

### Papéis (escopo)

| Papel | Permissões |
|---|---|
| Administrador | Acesso completo ao ambiente da empresa |
| Supervisor | Cria e programa O.S., acompanha execução, vê dashboards e relatórios |
| Técnico (`tecnico`) | Vê e executa somente as O.S. atribuídas a ele |

- Valores no banco: `administrador`, `supervisor`, `tecnico` (decidido em 2026-09-29).
- Uma O.S. pode ter mais de um técnico executor.

### Estados do vínculo usuário × empresa

| aprovado | ativo | Situação |
|---|---|---|
| false | true | Pendente |
| true | true | Ativo |
| true | false | Desativado |
| — | — | Rejeitado: registro excluído (pode solicitar de novo) |

### Fluxos implementados no banco

```
Criar conta (Supabase Auth)
   → trigger on_auth_user_created → handle_new_user() → public.users
   → "Criar empresa"  → verificar_subdominio() → criar_empresa(razão, fantasia, cnpj, matrícula, subdomínio)
        → vira administrador (aprovado); empresa nasce com subdomínio
   → listar_minhas_empresas() → escolhe empresa → redireciona para <subdominio>.manutgo.otimetech.com.br
   → "Entrar em empresa" → informa CNPJ → solicitar_acesso_empresa() → pendente (tecnico)
        → admin: listar_usuarios_empresa()
              → aprovar_usuario(papel, matrícula) | rejeitar_usuario()
        → admin: alterar_papel_usuario() | desativar_usuario() | reativar_usuario()
              (empresa nunca fica sem administrador ativo)
   → membros: listar_colegas_empresa() → nome e foto dos colegas
```

---

## 5. Módulos funcionais (escopo)

### 5.1 Cadastro da empresa (tenant)
Razão social, nome fantasia, CNPJ/CPF, telefone, e-mail, site, endereço, logo, cor principal, cor secundária, responsável, plano contratado, status da assinatura, data de criação. Usado também para personalizar PDFs.

### 5.2 Clientes
Razão social, nome fantasia, CNPJ, e-mail, telefone, endereço, cidade, estado, CEP, logo, contato principal, status ativo/inativo, observações.
- **Unidades:** um cliente tem várias unidades (ex.: Campinas, São Paulo, Sorocaba).
- Hierarquia da O.S.: `Cliente → Unidade → Equipamento`.

### 5.3 Equipamentos
Código interno, TAG, descrição, categoria, fabricante, modelo, número de série, ano, localização, cliente, unidade, data de instalação, status, foto, observações.
- **QR Code:** técnico lê o código e abre `Equipamento → Histórico → O.S. → Documentos`.
- **Histórico:** todas as intervenções no ativo (data + tipo de serviço).
- **Documentos:** manual, datasheet, certificado, laudo, desenho, PDF, foto.

### 5.4 Categorias e tipos de serviço
Personalizáveis por empresa.
- Categorias (ex.): Mecânica, Elétrica, Instrumentação, Civil, Refrigeração.
- Tipos (ex.): Preventiva, Corretiva, Inspeção, Instalação, Calibração, Visita técnica.

### 5.5 Checklists personalizados
Modelos criados pelo administrador.
- Tipos de resposta: Sim/Não, Conforme/Não conforme, OK/NOK, texto, número, data, lista de opções, foto obrigatória, observação, assinatura.
- Regras: resposta obrigatória; foto obrigatória em caso de NOK; observação obrigatória em não conformidade.

### 5.6 Ordem de Serviço (tela principal)
Cabeçalho: número, cliente, unidade, equipamento, categoria, tipo de serviço, prioridade, data de abertura, data e hora programadas, data de início, data de conclusão, responsável, executor(es), status.
- **Status:** `Aberta → Programada → Em andamento → Concluída | Cancelada`.
- **Numeração configurável** por empresa (ex.: `OS-2026-000154`).
- **Ações na listagem:** visualizar, editar, executar, gerar PDF, compartilhar, clonar, cancelar, excluir.
- **Clonar:** copia cliente, equipamento, categoria, descrição, checklist e executores; gera novo número e novas datas.

### 5.7 Execução (mobile)
Informações (cliente, equipamento, endereço), descrição do serviço, checklist, atividade realizada, horas trabalhadas (início, término, intervalo, total), fotos (antes, durante, depois, com observação por foto), pendências, materiais, assinaturas.

### 5.8 Assinaturas
Técnico e responsável do cliente assinam na tela do celular/tablet.

### 5.9 Relatório PDF
Cabeçalho com logo da empresa prestadora, número e data; cliente e unidade; equipamento (TAG, modelo, série); serviço solicitado; atividade executada; checklist (pergunta | resultado | observação); materiais (material | quantidade); evidências fotográficas antes/depois; pendências e recomendações; assinaturas técnico | cliente.

### 5.10 Dashboard (desktop)
- Cards: O.S. abertas, em andamento, concluídas, atrasadas.
- Gráficos: O.S. por mês, status, cliente, categoria, técnico; tempo médio de execução.
- Indicadores: O.S. vencidas, previstas para hoje e para a semana, tempo médio para conclusão, equipamentos com mais intervenções, clientes com mais chamados, técnicos com mais atividades, preventivas × corretivas.

### 5.11 Agenda
Visualização dia | semana | mês das O.S. programadas (hora — cliente — executor).

### 5.12 Notificações (preparar arquitetura)
Nova O.S. atribuída; O.S. próxima do vencimento; serviço atrasado; O.S. concluída (para o gestor).

### 5.13 Personalização por empresa
Logo, nome, cores, dados do PDF, categorias, tipos de serviço, checklists, status, usuários, numeração das O.S., domínio.

### 5.14 Melhoria futura — histórico de alterações da O.S.
Trilha de auditoria: criação, início, fotos adicionadas, assinatura, conclusão e edições posteriores (quem, o quê, quando). O.S. concluída não deve ser editada sem rastreabilidade.

---

## 6. Banco de dados — estado atual

Atualizado em 2026-10-03. Migrations em `supabase/migrations/`, todas registradas no histórico remoto:

| Versão | Nome | Conteúdo |
|---|---|---|
| `20260929000000` | `baseline` | Schema original criado pelo SQL Editor (reconstruído do catálogo) |
| `20260930022111` | `correcoes_fundacao` | Correções P1–P7, P9–P11, P13, P14 + matrícula |
| `20261003193146` | `pendentes_minhas_empresas` | `listar_minhas_empresas` passa a retornar `pendentes` (solicitações aguardando aprovação; só para administrador) |
| `20261003183249` | `storage_logos` | Bucket público `logos` (escrita só admin, caminho `{id_empresa}/logo.<ext>`) + RPC `solicitar_acesso_empresa_por_id` |
| `20261003180455` | `branding_dominios` | Branding/assinatura em `empresas`, `empresa_dominios`, subdomínio em `criar_empresa`, `resolver_tenant`, `listar_minhas_empresas` |

### Tabelas (`public`)

| Tabela | Colunas principais | RLS |
|---|---|---|
| `users` | `id` (uuid, FK `auth.users`), `nome`, `email`, `telefone`, `foto`, `ativo`, `created_at` | ✅ |
| `empresas` | `id` (bigint identity), `razao_social`, `nome_fantasia`, `cnpj` (único; maiúsculas sem máscara; check `cnpj_valido`), `email`, `telefone`, `endereco`, `numero`, `complemento`, `bairro`, `cidade`, `estado`, `cep`, `logo`, `site`, `responsavel`, `cor_primaria`/`cor_secundaria` (hex `#RRGGBB`; null = paleta padrão), `plano` (texto), `status_assinatura` (teste/ativa/suspensa/cancelada; default `teste`), `ativo`, `created_at` | ✅ |
| `empresa_dominios` | `id`, `id_empresa` (FK cascade), `dominio` (único, minúsculo), `tipo` (subdominio/proprio), `verificado`, `principal`, `created_at`; 1 subdomínio e 1 principal por empresa | ✅ |
| `empresa_usuarios` | `id`, `id_empresa`, `id_usuario`, `tipo_acesso` (administrador/supervisor/tecnico; default `tecnico`), `matricula` (obrigatória se aprovado; única por empresa), `aprovado`, `ativo`, `data_aprovacao`, `aprovado_por`, `created_at`; único `(id_empresa, id_usuario)` | ✅ |

### Colunas editáveis diretamente pelo cliente (`authenticated`)
- `users`: somente `nome`, `telefone`, `foto` (e-mail vem do Auth; `ativo` é do sistema).
- `empresas` (só admin, via RLS): dados cadastrais, `logo`, `site`, `responsavel`, `cor_primaria`, `cor_secundaria`. **Não**: `cnpj`, `ativo`, `plano`, `status_assinatura`.
- `empresa_dominios`: nenhuma escrita direta; só via RPC.
- `empresa_usuarios`: nenhuma escrita direta; só via RPC.

### Funções

| Função | Acesso | Descrição |
|---|---|---|
| `criar_empresa(razao_social, nome_fantasia, cnpj, matricula, subdominio)` | authenticated | Valida CNPJ e subdomínio, cria empresa + subdomínio e vincula criador como administrador aprovado |
| `verificar_subdominio(subdominio)` | authenticated | Valida formato/reservados e informa disponibilidade |
| `alterar_subdominio(id_empresa, subdominio)` | authenticated (só admin) | Troca o subdomínio da empresa |
| `resolver_tenant(host)` | **anon** + authenticated | Branding da empresa pelo host (só nome, logo, cores, subdomínio) |
| `listar_minhas_empresas()` | authenticated | Vínculos do usuário logado (inclui pendentes) com nome, logo, subdomínio, status e `pendentes` (nº de solicitações a aprovar, só para administrador) |
| `solicitar_acesso_empresa(cnpj)` | authenticated | Cria vínculo pendente (`tecnico`) com a empresa do CNPJ |
| `solicitar_acesso_empresa_por_id(id_empresa)` | authenticated | Mesma regra, pelo id (tela /sem-acesso do subdomínio, sem expor CNPJ) |
| `listar_usuarios_empresa(id_empresa)` | authenticated (só admin) | Lista vínculos com nome, e-mail, foto, matrícula, papel e status |
| `aprovar_usuario(id_empresa, id_usuario, tipo_acesso, matricula)` | authenticated (só admin) | Aprova **somente pendentes**, define papel e matrícula |
| `alterar_papel_usuario(id_empresa, id_usuario, tipo_acesso)` | authenticated (só admin) | Troca papel de usuário aprovado; bloqueia remover o último admin |
| `desativar_usuario(id_empresa, id_usuario)` | authenticated (só admin) | Desativa vínculo; bloqueia desativar o último admin |
| `reativar_usuario(id_empresa, id_usuario)` | authenticated (só admin) | Reativa vínculo desativado |
| `rejeitar_usuario(id_empresa, id_usuario)` | authenticated (só admin) | Exclui solicitação pendente |
| `listar_colegas_empresa(id_empresa)` | authenticated (membro) | Nome e foto dos membros ativos |
| `usuario_pertence_empresa(id_empresa)` | helper RLS | Vínculo aprovado + ativo + empresa ativa |
| `usuario_admin_empresa(id_empresa)` | helper RLS | Idem, com papel administrador |
| `normalizar_cnpj(cnpj)` / `cnpj_valido(cnpj)` | authenticated | Normalização e validação de CNPJ numérico/alfanumérico |
| `contar_admins_ativos(id_empresa)` | interno | Usado nas regras do último admin |
| `dominio_base()` / `normalizar_subdominio()` / `validar_subdominio()` | interno | Domínio base fixo (`manutgo.otimetech.com.br`) e regras do slug: 3–63 caracteres `[a-z0-9-]`, sem hífen nas pontas, lista de reservados (www, app, api, admin…) |
| `handle_new_user()` / `handle_user_email_change()` | interno (trigger) | Criação de perfil e sincronização de e-mail |

- `anon` executa somente `resolver_tenant`. Funções novas em `public` não recebem EXECUTE automático para `anon`/PUBLIC (default privileges); conceder explicitamente quando necessário (ex.: `resolver_tenant`).
- Retorno padrão das RPCs de escrita: `json` `{ success, message, ... }`.

### Storage
- Bucket `logos`: público para leitura; limite 1 MB; png, jpg, svg, webp. Policies em `storage.objects` (insert/update/delete/select) só para `usuario_admin_empresa` do id na primeira pasta do caminho.

### Triggers
- `on_auth_user_created` (insert em `auth.users`) → `handle_new_user()`.
- `on_auth_user_email_changed` (update de e-mail em `auth.users`) → `handle_user_email_change()`.

### Políticas RLS

| Tabela | Política | Operação | Regra |
|---|---|---|---|
| `users` | `usuario_visualiza_proprio_perfil` | SELECT | `id = (select auth.uid())` |
| `users` | `usuario_atualiza_proprio_perfil` | UPDATE | `id = (select auth.uid())` |
| `empresas` | `usuario_visualiza_empresa` | SELECT | `usuario_pertence_empresa(id)` |
| `empresas` | `admin_atualiza_empresa` | UPDATE | `usuario_admin_empresa(id)` |
| `empresa_usuarios` | `visualiza_vinculos` | SELECT | próprio vínculo ou admin da empresa |
| `empresa_dominios` | `membro_visualiza_dominios` | SELECT | `usuario_pertence_empresa(id_empresa)` |

### Índices
- `empresas_cnpj_unique (cnpj)`
- `empresa_usuarios_unique (id_empresa, id_usuario)`
- `empresa_usuarios_matricula_unique (id_empresa, matricula)`
- `idx_empresa_usuarios_usuario (id_usuario)`
- `idx_empresa_usuarios_aprovado (id_empresa, aprovado)`
- `idx_empresa_usuarios_aprovado_por (aprovado_por)`
- `empresa_dominios_dominio_unique (dominio)`
- `empresa_dominios_subdominio_unique (id_empresa) where tipo = 'subdominio'`
- `empresa_dominios_principal_unique (id_empresa) where principal`

### Advisors (após `branding_dominios`)
- Segurança: restam avisos esperados de "authenticated executa SECURITY DEFINER" (RPCs com verificação interna), "anon executa `resolver_tenant`" (intencional, só branding) e P8.
- Performance: só "índice não usado" (banco ainda sem dados).

---

## 7. Banco de dados — modelo planejado

### Tabelas

```
empresas                    ordens_servico
empresa_dominios            ordem_servico_executores
empresa_config (branding)   ordem_servico_checklist
users                       ordem_servico_atividades
empresa_usuarios            ordem_servico_materiais
clientes                    ordem_servico_fotos
cliente_unidades            ordem_servico_assinaturas
cliente_contatos            ordem_servico_historico
equipamentos                notificacoes
equipamento_documentos      planos
categorias_servico          assinaturas (planos SaaS)
tipos_servico
checklists
checklist_itens
```

### Buckets de Storage
`logos/`, `fotos_os/`, `assinaturas/`, `equipamentos/`, `documentos/`, `relatorios/` — sempre com prefixo `{id_empresa}/`.

---

## 8. Problemas conhecidos

| # | Severidade | Problema | Status |
|---|---|---|---|
| P1 | 🔴 Crítico | `solicitar_acesso_empresa()` insere `tipo_acesso = 'tecnico'`, mas o CHECK aceita só administrador/supervisor/executor. **Toda solicitação de acesso falha.** Default da coluna também é `'tecnico'`. | ✅ Corrigido (2026-09-29) |
| P2 | 🟠 Alto | Papéis divergentes: escopo (admin/supervisor/executor) × resumo do backend (admin/supervisor/planejador/técnico) × banco (admin/supervisor/executor). | ✅ Corrigido (2026-09-29) |
| P3 | 🟠 Alto | `aprovar_usuario()` altera qualquer vínculo ativo, inclusive já aprovado: admin pode rebaixar outros admins ou a si mesmo; empresa pode ficar sem administrador. | ✅ Corrigido (2026-09-29) |
| P4 | 🟡 Médio | Não existe função para desativar/reativar usuário (`ativo`). | ✅ Corrigido (2026-09-29) |
| P5 | 🟡 Médio | Validação de CNPJ só confere 14 dígitos (sem dígito verificador). Decidido: somente CNPJ. | ✅ Corrigido (2026-09-29) |
| P6 | 🟡 Médio | `usuario_pertence_empresa()` não verifica `empresas.ativo`: empresa desativada continua acessível. | ✅ Corrigido (2026-09-29) |
| P7 | 🟠 Alto | Segurança: `anon` e `PUBLIC` têm EXECUTE em todas as funções SECURITY DEFINER (o `revoke` citado no `.docx` não está em vigor). | ✅ Corrigido (2026-09-29) |
| P8 | 🟡 Médio | Proteção contra senha vazada desativada no Auth. | Manual: ativar no painel Supabase (Authentication → Policies); pode exigir plano Pro |
| P9 | 🟡 Médio | `users` só permite ver o próprio perfil; telas de O.S. precisarão ver nomes de colegas da mesma empresa. | ✅ Corrigido (2026-09-29) |
| P10 | 🔵 Baixo | Performance: policies usam `auth.uid()` sem `(select ...)`; FK `aprovado_por` sem índice; 2 policies SELECT permissivas em `empresa_usuarios`. | ✅ Corrigido (2026-09-29) |
| P11 | 🔵 Baixo | `users.email` não sincroniza quando o e-mail muda no Auth. | ✅ Corrigido (2026-09-29) |
| P13 | 🟠 Alto | Usuário pode alterar qualquer coluna do próprio perfil, inclusive `email` e `ativo`. | ✅ Corrigido (2026-09-29) |
| P14 | 🟠 Alto | Administrador pode alterar `cnpj` e `ativo` da própria empresa (ex.: reativar empresa bloqueada). | ✅ Corrigido (2026-09-29) |
| P12 | 🟠 Alto | Nenhuma migration versionada e projeto sem git: schema não reproduzível. | ✅ Corrigido (2026-09-29): git + migrations registradas no histórico remoto |

---

## 9. Decisões

| Data | Decisão | Motivo |
|---|---|---|
| — | Vínculo usuário × empresa via tabela `empresa_usuarios` (N:N), não `id_empresa` em `users` | Um usuário pode participar de várias empresas com papéis diferentes |
| — | CNPJ armazenado normalizado (sem máscara; ver decisão sobre alfanumérico) | Máscara é responsabilidade da interface |
| — | Quem cria a empresa vira administrador aprovado automaticamente | Fluxo de onboarding simples |
| — | Rejeição exclui o registro pendente | Permite nova solicitação futura |
| 2026-09-29 | Multi-tenant com banco Supabase compartilhado, isolamento por `id_empresa` + RLS | Custo e manutenção de um único projeto |
| 2026-09-29 | Cada empresa terá domínio/subdomínio personalizado; domínio define só branding | Identidade visual própria sem afetar segurança |
| 2026-09-29 | Frontend em Nuxt.js (Flutter descartado) | Definição do time |
| 2026-09-29 | `PROJETO.md` é o documento central e deve estar sempre atualizado | Comunicação central do projeto |
| 2026-09-29 | Papéis: `administrador`, `supervisor`, `tecnico` | Nome natural em pt-BR; planejador descartado |
| 2026-09-29 | Domínios: subdomínio para todas as empresas no início; domínio próprio na Fase 7 | Wildcard, zero configuração por empresa |
| 2026-09-29 | Hospedagem do frontend: VPS própria com Coolify | Escolha do responsável |
| 2026-09-29 | Gestão de papéis: `aprovar_usuario` só aprova vínculos pendentes; nova função `alterar_papel_usuario` troca o papel de aprovados; a empresa nunca pode ficar sem administrador ativo | Evita rebaixamento indevido e empresa sem admin (P3) |
| 2026-09-29 | Empresa identificada somente por CNPJ (CPF não aceito) | Definição do responsável (P5) |
| 2026-09-29 | Todo usuário da empresa tem matrícula: identificação interna (O.S., PDF, relatórios), informada pelo admin ao aprovar, única dentro da empresa. Login continua por e-mail | Definição do responsável |
| 2026-09-29 | CNPJ numérico e alfanumérico (IN RFB 2.229/2024), com dígito verificador; armazenado em maiúsculas sem máscara | Receita emite CNPJ alfanumérico desde jul/2026 |
| 2026-09-29 | Colegas da mesma empresa veem apenas nome e foto uns dos outros | Privacidade (P9) |
| 2026-09-29 | Em caso de dúvida, perguntar ao responsável antes de executar; a última palavra é sempre dele | Governança do projeto |
| 2026-09-29 | Design: fonte Inter, paleta azul petróleo do modelo, mapeamento do menu lateral (`design.md` seção 7) e interface em pt-BR — confirmados | Aprovação do responsável |
| 2026-09-29 | Estilo com Tailwind CSS (`@nuxtjs/tailwindcss`) no lugar de Twind | Twind está sem manutenção; Tailwind é o padrão no Nuxt |
| 2026-09-29 | UI segue exatamente o modelo `design_modelo.png`; `design.md` é o arquivo central de design | Padrão visual único e fiel ao modelo aprovado |
| 2026-10-03 | Renderização do Nuxt: SSR | Resolver o tenant pelo host no servidor, sem flash de tema |
| 2026-10-03 | Domínio base `manutgo.otimetech.com.br`; cada empresa em `<subdominio>.manutgo.otimetech.com.br` (DNS + certificado wildcard) | Domínio `otimetech.com.br` já é do responsável |
| 2026-10-03 | Subdomínio escolhido pelo admin ao criar a empresa; pode ser alterado depois pelo admin | Definição do responsável |
| 2026-10-03 | Domínio raiz: login geral + onboarding com marca padrão; após login, escolhe empresa e redireciona ao subdomínio | Definição do responsável |
| 2026-10-03 | Campos novos em `empresas`: cores principal/secundária, site, responsável, plano (texto) e status da assinatura (teste/ativa/suspensa/cancelada, default `teste`). Plano e status não são editáveis pelo admin da empresa | Definição do responsável; tabelas de planos ficam para a Fase 7 |
| 2026-10-03 | Backend + frontend divididos em 5 subprojetos (Frontend base → Cadastros → Checklists → Ordens de Serviço → Gestão), cada um com spec → plano → implementação. Começa pelo Frontend base | Escopo grande demais para uma entrega só |
| 2026-10-03 | Login na raiz e no subdomínio, com sessão compartilhada (cookie do domínio `.manutgo.otimetech.com.br`) | Definição do responsável |
| 2026-10-03 | Subdomínio sem vínculo ativo: tela de aviso com opções (solicitar acesso, minhas empresas, sair) | Definição do responsável |
| 2026-10-03 | Telas sem modelo visual são derivadas dos tokens do `design.md` e registradas nele; aprovação ao ver rodando | Definição do responsável |
| 2026-10-03 | Nome da plataforma: **ManutGO** (marca padrão na raiz e no login genérico) | Definição do responsável |
| 2026-10-03 | Toda mudança é testada e validada no navegador com Playwright; erros encontrados são corrigidos antes da entrega. Scripts em `web/tests/e2e/` | Regra do responsável |
| 2026-10-03 | Frontend em `web/`, Nuxt 4 SSR, `@nuxtjs/supabase`, Vitest. Spec: `docs/superpowers/specs/2026-10-03-frontend-base-design.md` | Aprovado pelo responsável |

---

## 10. Decisões pendentes

- [x] ~~Domínio base~~ → `manutgo.otimetech.com.br` (2026-10-03).
- [x] ~~Renderização~~ → SSR (2026-10-03).
- [ ] **Efeito de `status_assinatura`** (suspensa/cancelada) no acesso dos usuários — definir até a Fase 7.
- [ ] **Geração do PDF:** no navegador, Edge Function ou serviço dedicado.

### Melhorias menores do Frontend base (revisão de 2026-10-03)

- [ ] Cache de tenant: guardar "empresa não encontrada" por menos tempo (~5 s); hoje, após trocar o subdomínio, o novo endereço pode mostrar "Empresa não encontrada" por até 60 s se alguém o acessou antes.
- [ ] Revalidar vínculo ao navegar para rotas de admin (admin rebaixado por outro admin continua vendo o menu até recarregar; o banco já bloqueia as ações).
- [ ] Logos SVG no bucket público: avaliar bloquear SVG ou sanitizar no upload.
- [ ] `usuario_admin_empresa` não confere `empresas.ativo`: admin de empresa desativada ainda altera a logo.
- [ ] Login na raiz com uma só empresa ignora o `redirect` pedido (vai direto ao subdomínio).
- [ ] Sessão expirada no meio da navegação mostra erro do banco em vez de levar ao login.
- [ ] Documentar que o app precisa de proxy (Traefik/Coolify) sobrescrevendo `X-Forwarded-Host`.
- [ ] Host IPv6 (`[::1]:3000`) não é interpretado (só dev).

---

## 11. Checklist

Legenda: `[x]` concluído · `[ ]` pendente · `[~]` em andamento

### Fase 0 — Organização
- [x] Escopo inicial (`Escopo Projeto.docx`)
- [x] Análise do escopo e do banco atual
- [x] Criar documento central `PROJETO.md`
- [x] Criar `design.md` a partir do modelo `design_modelo.png`
- [x] Confirmar fonte, paleta, mapeamento do menu lateral e idioma da interface (`design.md`)
- [ ] Modelos visuais das demais telas e do mobile (`design.md` seção 11)
- [~] Resolver [decisões pendentes](#10-decisões-pendentes) (domínio base e renderização resolvidos)
- [x] `git init` (branch `main`) + `.gitignore`
- [x] Repositório remoto: `origin` = https://github.com/otimetech/Task-App (vazio)
- [x] Primeiro commit e push para `origin/main` (repositório privado)
- [x] Supabase CLI: `supabase init` (via `npx supabase`, v2.118.0)
- [x] Migration base `supabase/migrations/20260929000000_baseline.sql` (reconstruída do catálogo via MCP; Docker não instalado)
- [x] Baseline registrada no histórico remoto

### Fase 1 — Fundação multi-tenant (banco)
- [x] Tabela `users` + trigger `handle_new_user`
- [x] Tabela `empresas`
- [x] Tabela `empresa_usuarios`
- [x] RPCs: `criar_empresa`, `solicitar_acesso_empresa`, `listar_usuarios_empresa`, `aprovar_usuario`, `rejeitar_usuario`
- [x] Helpers RLS: `usuario_pertence_empresa`, `usuario_admin_empresa`
- [x] RLS em `users`, `empresas`, `empresa_usuarios`
- [x] Migration `20260930022111_correcoes_fundacao.sql` aplicada: P1–P7, P9–P11, P13, P14 corrigidos (39/39 testes a seco antes de aplicar)
- [x] Matrícula em `empresa_usuarios`
- [x] RPCs `alterar_papel_usuario`, `desativar_usuario`, `reativar_usuario`, `listar_colegas_empresa`
- [ ] P8: ativar proteção contra senha vazada no painel do Supabase (manual)
- [x] Campos de branding (cores, site, responsável, plano, status da assinatura)
- [x] Tabela `empresa_dominios` + RPCs `resolver_tenant`, `verificar_subdominio`, `alterar_subdominio`, `listar_minhas_empresas`; `criar_empresa` com subdomínio (migration `20261003180455_branding_dominios`, 27/27 testes a seco)

### Fase 2 — Frontend base (Nuxt)
- [x] Spec do Frontend base (`docs/superpowers/specs/2026-10-03-frontend-base-design.md`)
- [x] Plano de implementação do Frontend base (`docs/superpowers/plans/2026-10-03-frontend-base.md`, 15 tasks) — execução na branch `feat/frontend-base`
- [x] Migration `storage_logos` (bucket `logos` + RPC `solicitar_acesso_empresa_por_id`), versão `20261003183249`, 12/12 testes a seco
- [ ] Infra: DNS wildcard `*.manutgo.otimetech.com.br` + certificado wildcard no Coolify; Redirect URLs do Auth (`https://manutgo.otimetech.com.br/**`, `https://*.manutgo.otimetech.com.br/**`)
- [x] Criar projeto Nuxt (SSR) + Tailwind CSS (`@nuxtjs/tailwindcss`) em `web/`
- [x] Integração Supabase (`@nuxtjs/supabase`)
- [x] Resolução de tenant pelo host + tema dinâmico
- [x] Layout desktop (menu lateral + topbar)
- [x] Layout mobile (bottom navigation)
- [x] Telas de auth: cadastro, login, recuperar senha
- [x] Onboarding: criar empresa / solicitar acesso por CNPJ / aguardando aprovação
- [x] Seleção de empresa (usuário com vários vínculos)
- [x] Tela de gestão de usuários (aprovar, rejeitar, alterar papel, desativar)
- [x] Configurações da empresa (dados, logo, cores, subdomínio)
- [x] Dados de teste removidos do banco (empresas `demo-ui` e `teste-admin2`, usuários `teste.*@manutgo.test`, logo de teste)
- [x] Melhorias pós-entrega: aviso de solicitações pendentes em Minhas empresas e no menu Usuários (desktop e mobile), Usuários abre na aba Pendentes, cadastro avisa e-mail já cadastrado; validadas com Playwright (16 + 8 verificações)
- [x] Revisão final da branch `feat/frontend-base` (sem críticos; 1 importante corrigido) e merge em `main`

### Fase 3 — Cadastros
- [ ] Clientes
- [ ] Unidades do cliente
- [ ] Contatos do cliente
- [ ] Categorias de serviço
- [ ] Tipos de serviço
- [ ] Equipamentos
- [ ] Documentos de equipamentos
- [ ] QR Code de equipamentos

### Fase 4 — Checklists
- [ ] Modelos de checklist
- [ ] Itens com tipos de resposta
- [ ] Regras (obrigatório, foto em NOK, observação em não conformidade)

### Fase 5 — Ordens de Serviço
- [ ] Tabela e numeração configurável
- [ ] Executores múltiplos
- [ ] Listagem desktop com ações
- [ ] Clonar O.S.
- [ ] Execução mobile (atividades, horas, materiais, pendências)
- [ ] Fotos antes/durante/depois
- [ ] Checklist na execução
- [ ] Assinaturas técnico + cliente
- [ ] Relatório PDF

### Fase 6 — Gestão
- [ ] Dashboard (cards, gráficos, indicadores)
- [ ] Agenda (dia/semana/mês)
- [ ] Histórico do equipamento
- [ ] Notificações

### Fase 7 — SaaS
- [ ] Planos e assinaturas
- [ ] Domínio próprio por empresa (verificação + SSL)
- [ ] E-mails de auth com marca da empresa
- [ ] Histórico/auditoria de alterações da O.S.

---

## 12. Histórico de alterações

| Data | Alteração |
|---|---|
| 2026-09-29 | Criação do `PROJETO.md`: escopo consolidado, estado atual do banco, problemas conhecidos, decisões e checklist. Definida stack Nuxt.js + Tailwind CSS + Supabase e arquitetura multi-tenant com domínio por empresa. |
| 2026-09-29 | Criação do `design.md` (design system a partir de `design_modelo.png`). Identidade visual do `PROJETO.md` passa a apontar para ele; paleta `#2563EB` substituída. |
| 2026-09-29 | Twind trocado por Tailwind CSS (`@nuxtjs/tailwindcss`) em `PROJETO.md`, `design.md` e `CLAUDE.md`. |
| 2026-09-29 | Regra "perguntar antes de executar" registrada. Confirmadas decisões de design: fonte Inter, paleta do modelo, menu lateral, interface em pt-BR. |
| 2026-09-29 | Decididos papéis (`administrador`/`supervisor`/`tecnico`), subdomínio primeiro e hospedagem em VPS com Coolify. Autorizada preparação do ambiente local (git + Supabase CLI + migration base). |
| 2026-09-29 | Ambiente local: `git init`, `.gitignore`, `supabase init` e migration base reconstruída do banco via MCP (sem Docker). Nenhuma alteração no banco. |
| 2026-09-29 | Remoto `origin` configurado para https://github.com/otimetech/Task-App. |
| 2026-09-29 | Primeiro commit e push para `origin/main`. Versionados: documentação, `design_modelo.png`, `Escopo Projeto.docx`, configuração do MCP (`.mcp.json`, `.codex/`), skills do Supabase e pasta `supabase/`. Repositório privado. |
| 2026-09-29 | Decididos: regra de gestão de papéis (P3), somente CNPJ para empresa (P5), matrícula para técnico, colegas veem só nome e foto (P9). |
| 2026-09-29 | Matrícula definida (todos os usuários, informada pelo admin ao aprovar, única por empresa) e suporte a CNPJ alfanumérico. |
| 2026-09-29 | Migration de correção `20260929010000_correcoes_fundacao.sql` escrita e testada a seco no banco (39/39 testes, rollback total, banco intacto). Novos problemas identificados: P13, P14. |
| 2026-09-29 | Migration `correcoes_fundacao` aplicada no banco (versão `20260930022111`; arquivo local renomeado para a mesma versão). Baseline registrada no histórico remoto. P1–P7, P9–P14 corrigidos; P8 depende de ação manual no painel. Seção 6 atualizada. |
| 2026-10-03 | Decididos: SSR, domínio base `manutgo.otimetech.com.br` com subdomínio por empresa (escolhido pelo admin), raiz com login geral, campos de branding/assinatura. Migration `branding_dominios` (versão `20261003180455`) testada a seco (27/27) e aplicada: novos campos em `empresas`, tabela `empresa_dominios`, `criar_empresa` com subdomínio, RPCs `verificar_subdominio`, `alterar_subdominio`, `resolver_tenant` (anon) e `listar_minhas_empresas`. Fase 1 concluída, exceto P8 (manual). |
| 2026-10-03 | Brainstorming do Frontend base: decididos login na raiz e no subdomínio com sessão compartilhada, tela de aviso para subdomínio sem vínculo, telas derivadas dos tokens, Nuxt 4 em `web/` com `@nuxtjs/supabase`. Spec escrita em `docs/superpowers/specs/2026-10-03-frontend-base-design.md` (inclui migration futura `storage_logos` e RPC `solicitar_acesso_empresa_por_id`). |
| 2026-10-03 | Spec do Frontend base aprovada. Plano de implementação escrito em `docs/superpowers/plans/2026-10-03-frontend-base.md` (15 tasks). Nome exibido da plataforma configurável (`NUXT_PUBLIC_APP_NAME`, padrão `ManutGO`) — pendente de confirmação. |
| 2026-10-03 | Nome da plataforma confirmado: ManutGO. |
| 2026-10-03 | Frontend base, task 1: projeto Nuxt 4 criado em `web/` (Tailwind com tokens do `design.md`, `@nuxtjs/supabase`, Vitest, fonte Inter, tipos do banco em `web/shared/types/database.ts`). |
| 2026-10-03 | Frontend base, task 2: `analisarHost`, `montarUrlEmpresa`, `montarUrlRaiz` em `web/shared/utils/host.ts` (10 testes). |
| 2026-10-03 | Frontend base, task 3: `gerarVariaveisTema` e `estiloTema` em `web/shared/utils/tema.ts` (6 testes). |
| 2026-10-03 | Frontend base, task 4: validação de CNPJ (numérico/alfanumérico) e subdomínio no cliente, espelhando o banco (`web/shared/utils/cnpj.ts`, `subdominio.ts`). |
| 2026-10-03 | Frontend base, task 5: helper `rpc()` + `ErroApp` (mensagens do banco, erro de rede genérico) em `web/shared/utils/rpc.ts`. |
| 2026-10-03 | Frontend base, task 6: tenant resolvido no SSR (`server/middleware/tenant.ts`, cache 60 s), tema por empresa no `<html>`, página de erro "Empresa não encontrada". Sessão compartilhada entre raiz e subdomínios validada com `lvh.me`; domínio do cookie em runtime (`NUXT_PUBLIC_SUPABASE_COOKIE_OPTIONS_DOMAIN`). **Dados de teste no banco:** empresa `demo-ui` (id 3) e usuários `teste.admin@manutgo.test` / `teste.tecnico@manutgo.test` — remover ao final. |
| 2026-10-03 | Frontend base, task 7: migration `storage_logos` (versão `20261003183249`) testada a seco (12/12) e aplicada: bucket `logos` e RPC `solicitar_acesso_empresa_por_id`. |
| 2026-10-03 | Frontend base, task 8: componentes base em `web/app/components/` (cards, badges, abas, botões, campos, toast, diálogo, avatar, logo, card de autenticação), registrados no `design.md` seção 6.17; conferidos em screenshot com tema padrão e da `demo-ui`. |
| 2026-10-03 | Frontend base, task 9: regras de acesso (`decidirAcesso`, `destinoAposLogin`, `redirectSeguro`, 17 testes), cache de vínculos (`useMinhasEmpresas`) e middleware global de rotas. |
| 2026-10-03 | Frontend base, task 10: telas de login, cadastro, recuperar e redefinir senha (marca da empresa no subdomínio); verificadas no navegador (senha errada, destino após login, tema). |
| 2026-10-03 | Frontend base, task 11: telas da raiz: minhas empresas, criar empresa (subdomínio com checagem ao digitar, máscara de CNPJ) e solicitar acesso; verificadas no navegador. Novos dados de teste: empresa `teste-admin` e usuário `teste.vazio@manutgo.test`. |
| 2026-10-03 | Frontend base, task 12: layout do app (sidebar, topbar, bottom navigation mobile), Início provisório e tela `/sem-acesso` com solicitação de acesso; verificados no navegador (admin, pendente, sem vínculo, mobile 390 px). |
| 2026-10-03 | Frontend base, task 13: tela `/usuarios` (admin): aprovar com papel e matrícula, rejeitar, alterar papel, desativar, reativar; mensagens de regra do banco; verificada no navegador (matrícula repetida, último admin, técnico desativado/reativado). |
| 2026-10-03 | Frontend base, task 14: tela `/configuracoes` (admin): dados cadastrais, logo (bucket `logos`, até 1 MB), cores com prévia ao vivo e alteração de subdomínio; verificada no navegador. Empresa de teste agora em `teste-admin2`. |
| 2026-10-03 | Frontend base, task 15: fechamento: `web/README.md` (como rodar, variáveis, `*.localhost`/`lvh.me`), 64 testes passando, build ok, sessão compartilhada raiz ↔ subdomínio verificada no navegador com `lvh.me` (login, entrar, sair). Remoção dos dados de teste aguarda confirmação. |
| 2026-10-03 | Revisão final do Frontend base: nenhum problema crítico; corrigido o cache de tenant sem limite (agora 1000 hosts, expiração removida na leitura; 3 testes). Dados de teste removidos do banco com autorização do responsável. Pendências menores registradas na seção 10. Merge de `feat/frontend-base` em `main`. |
| 2026-10-03 | Melhorias após uso do responsável: contador de solicitações pendentes (migration `pendentes_minhas_empresas`, versão `20261003193146`, 4/4 testes a seco) em Minhas empresas, menu Usuários e botão Mais (mobile); Usuários abre na aba Pendentes; cadastro com e-mail existente avisa e oferece recuperar senha. Bugs achados no Playwright e corrigidos: texto de ajuda/prévia dentro do `<label>` (nome acessível errado), envio nativo do formulário antes da hidratação (dados perdidos), barra de rolagem vertical nas abas. Regra nova: validar sempre com Playwright. |
