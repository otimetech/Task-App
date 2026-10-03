-- =============================================================================
-- Fase 1: branding da empresa, subdomínios e resolução de tenant pelo host
-- Decisões aplicadas (PROJETO.md, seção 9, 2026-10-03):
--   - Domínio base: manutgo.otimetech.com.br; cada empresa usa <slug>.manutgo.otimetech.com.br
--   - Subdomínio escolhido pelo admin ao criar a empresa; pode ser alterado depois
--   - Domínio raiz: login geral + onboarding com marca padrão
--   - plano (texto livre) e status_assinatura (teste/ativa/suspensa/cancelada),
--     não editáveis pelo admin da empresa
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Campos de branding e assinatura em empresas
-- -----------------------------------------------------------------------------

alter table public.empresas
  add column site text,
  add column responsavel text,
  add column cor_primaria text,
  add column cor_secundaria text,
  add column plano text,
  add column status_assinatura text not null default 'teste';

alter table public.empresas
  add constraint empresas_cor_primaria_hex
    check (cor_primaria is null or cor_primaria ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint empresas_cor_secundaria_hex
    check (cor_secundaria is null or cor_secundaria ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint empresas_status_assinatura_check
    check (status_assinatura in ('teste', 'ativa', 'suspensa', 'cancelada'));

-- Admin altera dados cadastrais e branding; nunca cnpj, ativo, plano ou status_assinatura
revoke update on public.empresas from anon, authenticated;
grant update (
  razao_social, nome_fantasia, email, telefone, endereco, numero,
  complemento, bairro, cidade, estado, cep, logo,
  site, responsavel, cor_primaria, cor_secundaria
) on public.empresas to authenticated;

-- -----------------------------------------------------------------------------
-- Domínio base e regras de subdomínio
-- -----------------------------------------------------------------------------

create function public.dominio_base()
returns text
language sql
immutable
set search_path to ''
as $function$
  select 'manutgo.otimetech.com.br'::text;
$function$;

create function public.normalizar_subdominio(p_subdominio text)
returns text
language sql
immutable
set search_path to ''
as $function$
  select lower(trim(coalesce(p_subdominio, '')));
$function$;

-- Retorna null se válido, ou a mensagem de erro
create function public.validar_subdominio(p_subdominio text)
returns text
language plpgsql
immutable
set search_path to ''
as $function$
begin
  if p_subdominio is null or p_subdominio = '' then
    return 'Subdomínio é obrigatório.';
  end if;

  if p_subdominio !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' then
    return 'Subdomínio deve ter de 3 a 63 caracteres: letras minúsculas, números e hífen (sem hífen no início ou no fim).';
  end if;

  if p_subdominio = any (array[
    'www', 'app', 'api', 'admin', 'painel', 'login', 'auth', 'conta', 'cadastro',
    'mail', 'email', 'smtp', 'imap', 'pop', 'ftp', 'ns1', 'ns2',
    'static', 'cdn', 'assets', 'img', 'files', 'storage',
    'suporte', 'ajuda', 'help', 'status', 'blog', 'docs',
    'dev', 'staging', 'homolog', 'teste', 'test', 'demo',
    'manutgo', 'otimetech'
  ]) then
    return 'Este subdomínio é reservado.';
  end if;

  return null;
end;
$function$;

-- -----------------------------------------------------------------------------
-- empresa_dominios
--   tipo 'subdominio': dominio = slug (ex.: 'empresaabc')
--   tipo 'proprio'   : dominio = host completo (ex.: 'os.empresaabc.com.br'), Fase 7
-- -----------------------------------------------------------------------------

create table public.empresa_dominios (
  id bigint generated always as identity primary key,
  id_empresa bigint not null references public.empresas (id) on delete cascade,
  dominio text not null,
  tipo text not null,
  verificado boolean not null default false,
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  constraint empresa_dominios_tipo_check
    check (tipo in ('subdominio', 'proprio')),
  constraint empresa_dominios_minusculo
    check (dominio = lower(dominio)),
  constraint empresa_dominios_formato check (
    (tipo = 'subdominio' and dominio ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$')
    or (tipo = 'proprio' and dominio ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$')
  )
);

create unique index empresa_dominios_dominio_unique
  on public.empresa_dominios using btree (dominio);

-- Uma empresa tem um único subdomínio e um único domínio principal
create unique index empresa_dominios_subdominio_unique
  on public.empresa_dominios using btree (id_empresa)
  where tipo = 'subdominio';

create unique index empresa_dominios_principal_unique
  on public.empresa_dominios using btree (id_empresa)
  where principal;

alter table public.empresa_dominios enable row level security;

create policy membro_visualiza_dominios on public.empresa_dominios
  for select to authenticated
  using (public.usuario_pertence_empresa(id_empresa));

-- Escrita somente via RPC
revoke all on public.empresa_dominios from anon, authenticated;
grant select on public.empresa_dominios to authenticated;

-- -----------------------------------------------------------------------------
-- verificar_subdominio: disponibilidade para a tela de criação
-- -----------------------------------------------------------------------------

create function public.verificar_subdominio(p_subdominio text)
returns json
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_subdominio text;
  v_erro text;
begin

  if auth.uid() is null then
    return json_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  v_subdominio := public.normalizar_subdominio(p_subdominio);
  v_erro := public.validar_subdominio(v_subdominio);

  if v_erro is not null then
    return json_build_object('success', false, 'disponivel', false, 'message', v_erro);
  end if;

  if exists (select 1 from public.empresa_dominios where dominio = v_subdominio) then
    return json_build_object('success', true, 'disponivel', false, 'message', 'Subdomínio já está em uso.');
  end if;

  return json_build_object(
    'success', true,
    'disponivel', true,
    'message', 'Subdomínio disponível.',
    'subdominio', v_subdominio,
    'host', v_subdominio || '.' || public.dominio_base()
  );
end;
$function$;

-- -----------------------------------------------------------------------------
-- criar_empresa: passa a exigir o subdomínio
-- -----------------------------------------------------------------------------

drop function public.criar_empresa(text, text, text, text);

create function public.criar_empresa(
  p_razao_social text,
  p_nome_fantasia text,
  p_cnpj text,
  p_matricula text,
  p_subdominio text
)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_usuario uuid;
  v_empresa bigint;
  v_cnpj text;
  v_matricula text;
  v_subdominio text;
  v_erro text;
  v_constraint text;
begin

  v_usuario := auth.uid();

  if v_usuario is null then
    return json_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  if trim(coalesce(p_razao_social, '')) = '' then
    return json_build_object('success', false, 'message', 'Razão social é obrigatória.');
  end if;

  v_matricula := nullif(trim(coalesce(p_matricula, '')), '');

  if v_matricula is null then
    return json_build_object('success', false, 'message', 'Matrícula é obrigatória.');
  end if;

  v_cnpj := public.normalizar_cnpj(p_cnpj);

  if not public.cnpj_valido(v_cnpj) then
    return json_build_object('success', false, 'message', 'CNPJ inválido.');
  end if;

  v_subdominio := public.normalizar_subdominio(p_subdominio);
  v_erro := public.validar_subdominio(v_subdominio);

  if v_erro is not null then
    return json_build_object('success', false, 'message', v_erro);
  end if;

  if exists (select 1 from public.empresas where cnpj = v_cnpj) then
    return json_build_object('success', false, 'message', 'Já existe uma empresa cadastrada com este CNPJ.');
  end if;

  if exists (select 1 from public.empresa_dominios where dominio = v_subdominio) then
    return json_build_object('success', false, 'message', 'Subdomínio já está em uso.');
  end if;

  insert into public.empresas (razao_social, nome_fantasia, cnpj, ativo)
  values (
    trim(p_razao_social),
    nullif(trim(coalesce(p_nome_fantasia, '')), ''),
    v_cnpj,
    true
  )
  returning id into v_empresa;

  insert into public.empresa_dominios (id_empresa, dominio, tipo, verificado, principal)
  values (v_empresa, v_subdominio, 'subdominio', true, true);

  -- Criador vira administrador aprovado
  insert into public.empresa_usuarios (
    id_empresa, id_usuario, tipo_acesso, matricula,
    aprovado, ativo, data_aprovacao, aprovado_por
  )
  values (
    v_empresa, v_usuario, 'administrador', v_matricula,
    true, true, now(), v_usuario
  );

  return json_build_object(
    'success', true,
    'message', 'Empresa criada com sucesso.',
    'id_empresa', v_empresa,
    'subdominio', v_subdominio,
    'host', v_subdominio || '.' || public.dominio_base()
  );

exception
  when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'empresa_dominios_dominio_unique' then
      return json_build_object('success', false, 'message', 'Subdomínio já está em uso.');
    end if;
    return json_build_object('success', false, 'message', 'Já existe uma empresa cadastrada com este CNPJ.');
end;
$function$;

-- -----------------------------------------------------------------------------
-- alterar_subdominio: somente admin
-- -----------------------------------------------------------------------------

create function public.alterar_subdominio(p_id_empresa bigint, p_subdominio text)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_subdominio text;
  v_erro text;
begin

  if auth.uid() is null then
    return json_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  if not public.usuario_admin_empresa(p_id_empresa) then
    return json_build_object('success', false, 'message', 'Apenas administradores podem alterar o subdomínio.');
  end if;

  v_subdominio := public.normalizar_subdominio(p_subdominio);
  v_erro := public.validar_subdominio(v_subdominio);

  if v_erro is not null then
    return json_build_object('success', false, 'message', v_erro);
  end if;

  if exists (
    select 1 from public.empresa_dominios
    where id_empresa = p_id_empresa and tipo = 'subdominio' and dominio = v_subdominio
  ) then
    return json_build_object('success', false, 'message', 'Este já é o subdomínio atual.');
  end if;

  if exists (select 1 from public.empresa_dominios where dominio = v_subdominio) then
    return json_build_object('success', false, 'message', 'Subdomínio já está em uso.');
  end if;

  update public.empresa_dominios
  set dominio = v_subdominio
  where id_empresa = p_id_empresa and tipo = 'subdominio';

  if not found then
    insert into public.empresa_dominios (id_empresa, dominio, tipo, verificado, principal)
    values (
      p_id_empresa, v_subdominio, 'subdominio', true,
      not exists (select 1 from public.empresa_dominios where id_empresa = p_id_empresa and principal)
    );
  end if;

  return json_build_object(
    'success', true,
    'message', 'Subdomínio alterado com sucesso.',
    'subdominio', v_subdominio,
    'host', v_subdominio || '.' || public.dominio_base()
  );

exception
  when unique_violation then
    return json_build_object('success', false, 'message', 'Subdomínio já está em uso.');
end;
$function$;

-- -----------------------------------------------------------------------------
-- resolver_tenant: público (anon), retorna SOMENTE dados de branding
--   '<slug>.manutgo.otimetech.com.br' -> subdomínio
--   outro host                        -> domínio próprio verificado (Fase 7)
--   domínio raiz ou desconhecido      -> nenhuma linha (marca padrão)
-- -----------------------------------------------------------------------------

create function public.resolver_tenant(p_host text)
returns table (
  id_empresa bigint,
  nome text,
  logo text,
  cor_primaria text,
  cor_secundaria text,
  subdominio text
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_host text;
  v_sufixo text;
  v_slug text;
begin

  -- Normaliza: minúsculas, sem porta, sem ponto final
  v_host := rtrim(split_part(lower(trim(coalesce(p_host, ''))), ':', 1), '.');
  v_sufixo := '.' || public.dominio_base();

  if v_host = '' or v_host = public.dominio_base() then
    return;
  end if;

  if right(v_host, length(v_sufixo)) = v_sufixo then
    v_slug := left(v_host, length(v_host) - length(v_sufixo));

    -- Apenas um nível de subdomínio
    if v_slug = '' or position('.' in v_slug) > 0 then
      return;
    end if;

    return query
      select e.id, coalesce(e.nome_fantasia, e.razao_social), e.logo,
             e.cor_primaria, e.cor_secundaria, d.dominio
      from public.empresa_dominios d
      join public.empresas e on e.id = d.id_empresa
      where d.dominio = v_slug
        and d.tipo = 'subdominio'
        and e.ativo = true;
    return;
  end if;

  return query
    select e.id, coalesce(e.nome_fantasia, e.razao_social), e.logo,
           e.cor_primaria, e.cor_secundaria, s.dominio
    from public.empresa_dominios d
    join public.empresas e on e.id = d.id_empresa
    left join public.empresa_dominios s
      on s.id_empresa = e.id and s.tipo = 'subdominio'
    where d.dominio = v_host
      and d.tipo = 'proprio'
      and d.verificado = true
      and e.ativo = true;
end;
$function$;

-- -----------------------------------------------------------------------------
-- listar_minhas_empresas: vínculos do usuário logado (inclui pendentes)
-- Usado no domínio raiz para escolher a empresa e redirecionar ao subdomínio
-- -----------------------------------------------------------------------------

create function public.listar_minhas_empresas()
returns table (
  id_empresa bigint,
  nome text,
  logo text,
  subdominio text,
  tipo_acesso text,
  aprovado boolean,
  ativo boolean,
  empresa_ativa boolean
)
language sql
stable
security definer
set search_path to ''
as $function$
  select e.id, coalesce(e.nome_fantasia, e.razao_social), e.logo, d.dominio,
         eu.tipo_acesso, eu.aprovado, eu.ativo, e.ativo
  from public.empresa_usuarios eu
  join public.empresas e on e.id = eu.id_empresa
  left join public.empresa_dominios d
    on d.id_empresa = e.id and d.tipo = 'subdominio'
  where eu.id_usuario = (select auth.uid())
  order by coalesce(e.nome_fantasia, e.razao_social);
$function$;

-- -----------------------------------------------------------------------------
-- Permissões de execução
-- -----------------------------------------------------------------------------

revoke all on function public.dominio_base() from public, anon, authenticated;
revoke all on function public.normalizar_subdominio(text) from public, anon, authenticated;
revoke all on function public.validar_subdominio(text) from public, anon, authenticated;
revoke all on function public.verificar_subdominio(text) from public, anon;
revoke all on function public.criar_empresa(text, text, text, text, text) from public, anon;
revoke all on function public.alterar_subdominio(bigint, text) from public, anon;
revoke all on function public.resolver_tenant(text) from public;
revoke all on function public.listar_minhas_empresas() from public, anon;

grant execute on function public.verificar_subdominio(text) to authenticated;
grant execute on function public.criar_empresa(text, text, text, text, text) to authenticated;
grant execute on function public.alterar_subdominio(bigint, text) to authenticated;
grant execute on function public.resolver_tenant(text) to anon, authenticated;
grant execute on function public.listar_minhas_empresas() to authenticated;
