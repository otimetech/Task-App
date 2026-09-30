# TaskApp — SaaS de Gestão de Ordens de Serviço

> **Documento central do projeto.** Toda decisão, mudança de banco, funcionalidade entregue e pendência é registrada aqui.
> **Regra:** este arquivo deve ser atualizado a cada alteração no projeto (código, banco, decisão ou escopo).

- **Última atualização:** 2026-09-29
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

> Flutter foi descartado (2026-09-29). O resumo do backend no `.docx` ainda cita Flutter; vale o Nuxt.

### Identidade visual

**Fonte oficial: [`design.md`](design.md)** (tokens, componentes, layout), baseado no modelo [`design_modelo.png`](design_modelo.png). A interface deve seguir o modelo exatamente.

Resumo: fundo `#EEF0F2`, cards brancos com borda sutil, cor de marca azul petróleo (`#004E61` / `#266478`), status verde/vermelho/laranja, fonte Inter, sidebar fixa + grid de 3 colunas no desktop. Cada empresa-tenant pode sobrescrever logo e a família `brand-*` de cores (ver seção 3).

> A paleta azul `#2563EB` do escopo original foi substituída pela paleta do modelo (2026-09-29).

---

## 3. Arquitetura multi-tenant

**Modelo:** um único banco Supabase compartilhado. Cada empresa (tenant) tem seus dados isolados por `id_empresa` + políticas RLS, e seu próprio domínio/subdomínio com identidade visual própria.

```
empresaabc.com.br ─┐
os.xyz.com.br     ─┼─► mesmo frontend Nuxt (1 deploy) ─► mesmo Supabase (1 projeto)
abc.otimetech.app ─┘          │                                  │
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

### Resolução do tenant pelo domínio (planejado)

- Tabela `empresa_dominios` (`id_empresa`, `dominio` único e minúsculo, `tipo` subdominio/proprio, `verificado`, `principal`).
- RPC pública `resolver_tenant(p_host)` executável por `anon`, retornando **apenas** dados de branding (nome fantasia, logo, cores).
- Nuxt resolve o host no servidor (middleware/plugin SSR) e aplica o tema.

### Limitações do Supabase a considerar

- **Auth único por projeto:** templates de e-mail e SMTP são globais. Para e-mails com marca de cada empresa: Send Email Hook + Edge Function.
- **Redirect URLs:** cada domínio próprio precisa estar na allowlist do Auth. Subdomínios aceitam wildcard (`https://*.otimetech.app/**`). Domínios próprios: automatizar via Management API ou centralizar o login em um domínio.
- **Domínio customizado da API Supabase:** um por projeto. A API permanece em endereço único; só o frontend usa domínios por tenant.
- **Subdomínios (fase inicial):** DNS wildcard `*.<dominio-base>` apontando para a VPS; Coolify (Traefik) com certificado wildcard via desafio DNS do Let's Encrypt.
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
   → "Criar empresa"  → criar_empresa(razão, fantasia, cnpj, matrícula) → vira administrador (aprovado)
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

Atualizado em 2026-09-29. Migrations em `supabase/migrations/`, todas registradas no histórico remoto:

| Versão | Nome | Conteúdo |
|---|---|---|
| `20260929000000` | `baseline` | Schema original criado pelo SQL Editor (reconstruído do catálogo) |
| `20260930022111` | `correcoes_fundacao` | Correções P1–P7, P9–P11, P13, P14 + matrícula |

### Tabelas (`public`)

| Tabela | Colunas principais | RLS |
|---|---|---|
| `users` | `id` (uuid, FK `auth.users`), `nome`, `email`, `telefone`, `foto`, `ativo`, `created_at` | ✅ |
| `empresas` | `id` (bigint identity), `razao_social`, `nome_fantasia`, `cnpj` (único; maiúsculas sem máscara; check `cnpj_valido`), `email`, `telefone`, `endereco`, `numero`, `complemento`, `bairro`, `cidade`, `estado`, `cep`, `logo`, `ativo`, `created_at` | ✅ |
| `empresa_usuarios` | `id`, `id_empresa`, `id_usuario`, `tipo_acesso` (administrador/supervisor/tecnico; default `tecnico`), `matricula` (obrigatória se aprovado; única por empresa), `aprovado`, `ativo`, `data_aprovacao`, `aprovado_por`, `created_at`; único `(id_empresa, id_usuario)` | ✅ |

### Colunas editáveis diretamente pelo cliente (`authenticated`)
- `users`: somente `nome`, `telefone`, `foto` (e-mail vem do Auth; `ativo` é do sistema).
- `empresas` (só admin, via RLS): dados cadastrais e `logo`. **Não**: `cnpj`, `ativo`.
- `empresa_usuarios`: nenhuma escrita direta; só via RPC.

### Funções

| Função | Acesso | Descrição |
|---|---|---|
| `criar_empresa(razao_social, nome_fantasia, cnpj, matricula)` | authenticated | Valida CNPJ, cria empresa e vincula criador como administrador aprovado |
| `solicitar_acesso_empresa(cnpj)` | authenticated | Cria vínculo pendente (`tecnico`) com a empresa do CNPJ |
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
| `handle_new_user()` / `handle_user_email_change()` | interno (trigger) | Criação de perfil e sincronização de e-mail |

- `anon` não executa nenhuma função. Funções novas em `public` não recebem EXECUTE automático para `anon`/PUBLIC (default privileges); conceder explicitamente quando necessário (ex.: `resolver_tenant`).
- Retorno padrão das RPCs de escrita: `json` `{ success, message, ... }`.

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

### Índices
- `empresas_cnpj_unique (cnpj)`
- `empresa_usuarios_unique (id_empresa, id_usuario)`
- `empresa_usuarios_matricula_unique (id_empresa, matricula)`
- `idx_empresa_usuarios_usuario (id_usuario)`
- `idx_empresa_usuarios_aprovado (id_empresa, aprovado)`
- `idx_empresa_usuarios_aprovado_por (aprovado_por)`

### Advisors (após a migration)
- Segurança: restam avisos esperados de "authenticated executa SECURITY DEFINER" (RPCs com verificação interna) e P8.
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

---

## 10. Decisões pendentes

- [ ] **Domínio base** da plataforma.
- [ ] **Renderização:** SSR (necessário para resolver tenant pelo host no servidor) ou SPA.
- [ ] **Geração do PDF:** no navegador, Edge Function ou serviço dedicado.

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
- [ ] Resolver [decisões pendentes](#10-decisões-pendentes)
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
- [ ] Campos de branding (cores, site, responsável, plano, status da assinatura)
- [ ] Tabela `empresa_dominios` + RPC `resolver_tenant`

### Fase 2 — Frontend base (Nuxt)
- [ ] Criar projeto Nuxt + Tailwind CSS (`@nuxtjs/tailwindcss`)
- [ ] Integração Supabase (`@nuxtjs/supabase`)
- [ ] Resolução de tenant pelo host + tema dinâmico
- [ ] Layout desktop (menu lateral + topbar)
- [ ] Layout mobile (bottom navigation)
- [ ] Telas de auth: cadastro, login, recuperar senha
- [ ] Onboarding: criar empresa / solicitar acesso por CNPJ / aguardando aprovação
- [ ] Seleção de empresa (usuário com vários vínculos)
- [ ] Tela de gestão de usuários (aprovar, rejeitar, alterar papel, desativar)
- [ ] Configurações da empresa (dados, logo, cores)

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
