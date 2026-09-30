-- =============================================================================
-- Correções da fundação multi-tenant (PROJETO.md, seção 8: P1..P11, P13, P14)
-- Decisões aplicadas (PROJETO.md, seção 9):
--   - Papéis: administrador, supervisor, tecnico
--   - Matrícula obrigatória para todo usuário aprovado, única por empresa,
--     informada pelo admin ao aprovar (criador informa ao criar a empresa)
--   - Somente CNPJ, numérico ou alfanumérico, com dígito verificador
--   - aprovar_usuario só aprova pendentes; alterar_papel_usuario troca papel;
--     empresa nunca fica sem administrador ativo
--   - Colegas veem apenas nome e foto
-- =============================================================================

-- -----------------------------------------------------------------------------
-- P1/P2: papéis administrador / supervisor / tecnico
-- -----------------------------------------------------------------------------

alter table public.empresa_usuarios
  drop constraint empresa_usuarios_tipo_acesso_check;

update public.empresa_usuarios
set tipo_acesso = 'tecnico'
where tipo_acesso = 'executor';

alter table public.empresa_usuarios
  add constraint empresa_usuarios_tipo_acesso_check
  check (tipo_acesso in ('administrador', 'supervisor', 'tecnico'));

alter table public.empresa_usuarios
  alter column tipo_acesso set default 'tecnico';

-- -----------------------------------------------------------------------------
-- Matrícula: obrigatória após aprovação, única dentro da empresa
-- -----------------------------------------------------------------------------

alter table public.empresa_usuarios
  add column matricula text;

alter table public.empresa_usuarios
  add constraint empresa_usuarios_matricula_obrigatoria
  check (aprovado = false or nullif(trim(matricula), '') is not null);

alter table public.empresa_usuarios
  add constraint empresa_usuarios_matricula_unique
  unique (id_empresa, matricula);

-- -----------------------------------------------------------------------------
-- P5: CNPJ numérico e alfanumérico com dígito verificador
-- -----------------------------------------------------------------------------

-- Remove máscara e converte para maiúsculas: '12.abc.345/01de-35' -> '12ABC34501DE35'
create or replace function public.normalizar_cnpj(p_cnpj text)
returns text
language sql
immutable
set search_path to ''
as $function$
  select regexp_replace(upper(coalesce(p_cnpj, '')), '[^0-9A-Z]', '', 'g');
$function$;

-- Valida CNPJ já normalizado. Cada caractere vale ascii - 48
-- (dígitos 0..9, letras A=17 .. Z=42). DVs são sempre numéricos.
create or replace function public.cnpj_valido(p_cnpj text)
returns boolean
language plpgsql
immutable
set search_path to ''
as $function$
declare
  v_pesos1 int[] := array[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  v_pesos2 int[] := array[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  v_soma int;
  v_resto int;
  v_dv1 int;
  v_dv2 int;
begin

  if p_cnpj is null or p_cnpj !~ '^[0-9A-Z]{12}[0-9]{2}$' then
    return false;
  end if;

  -- Rejeita sequências repetidas (00000000000000, 11111111111111...)
  if p_cnpj ~ '^(.)\1{13}$' then
    return false;
  end if;

  v_soma := 0;
  for i in 1..12 loop
    v_soma := v_soma + (ascii(substr(p_cnpj, i, 1)) - 48) * v_pesos1[i];
  end loop;
  v_resto := v_soma % 11;
  v_dv1 := case when v_resto < 2 then 0 else 11 - v_resto end;

  v_soma := 0;
  for i in 1..13 loop
    v_soma := v_soma + (ascii(substr(p_cnpj, i, 1)) - 48) * v_pesos2[i];
  end loop;
  v_resto := v_soma % 11;
  v_dv2 := case when v_resto < 2 then 0 else 11 - v_resto end;

  return substr(p_cnpj, 13, 1)::int = v_dv1
     and substr(p_cnpj, 14, 1)::int = v_dv2;

end;
$function$;

alter table public.empresas
  add constraint empresas_cnpj_valido
  check (public.cnpj_valido(cnpj));

-- -----------------------------------------------------------------------------
-- P6: empresa inativa bloqueia acesso
-- -----------------------------------------------------------------------------

create or replace function public.usuario_pertence_empresa(p_id_empresa bigint)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.empresa_usuarios eu
    join public.empresas e on e.id = eu.id_empresa
    where eu.id_empresa = p_id_empresa
      and eu.id_usuario = (select auth.uid())
      and eu.aprovado = true
      and eu.ativo = true
      and e.ativo = true
  );
$function$;

create or replace function public.usuario_admin_empresa(p_id_empresa bigint)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.empresa_usuarios eu
    join public.empresas e on e.id = eu.id_empresa
    where eu.id_empresa = p_id_empresa
      and eu.id_usuario = (select auth.uid())
      and eu.tipo_acesso = 'administrador'
      and eu.aprovado = true
      and eu.ativo = true
      and e.ativo = true
  );
$function$;

-- Conta administradores aprovados e ativos (uso interno)
create or replace function public.contar_admins_ativos(p_id_empresa bigint)
returns int
language sql
stable security definer
set search_path to ''
as $function$
  select count(*)::int
  from public.empresa_usuarios eu
  where eu.id_empresa = p_id_empresa
    and eu.tipo_acesso = 'administrador'
    and eu.aprovado = true
    and eu.ativo = true;
$function$;

-- -----------------------------------------------------------------------------
-- criar_empresa: CNPJ validado + matrícula do criador
-- -----------------------------------------------------------------------------

drop function public.criar_empresa(text, text, text);

create function public.criar_empresa(
  p_razao_social text,
  p_nome_fantasia text,
  p_cnpj text,
  p_matricula text
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

  if exists (select 1 from public.empresas where cnpj = v_cnpj) then
    return json_build_object('success', false, 'message', 'Já existe uma empresa cadastrada com este CNPJ.');
  end if;

  insert into public.empresas (razao_social, nome_fantasia, cnpj, ativo)
  values (
    trim(p_razao_social),
    nullif(trim(coalesce(p_nome_fantasia, '')), ''),
    v_cnpj,
    true
  )
  returning id into v_empresa;

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
    'id_empresa', v_empresa
  );

exception
  when unique_violation then
    return json_build_object('success', false, 'message', 'Já existe uma empresa cadastrada com este CNPJ.');
end;
$function$;

-- -----------------------------------------------------------------------------
-- solicitar_acesso_empresa: CNPJ normalizado (alfanumérico) + papel tecnico
-- -----------------------------------------------------------------------------

create or replace function public.solicitar_acesso_empresa(p_cnpj text)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_usuario uuid;
  v_empresa bigint;
  v_cnpj text;
begin

  v_usuario := auth.uid();

  if v_usuario is null then
    return json_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  v_cnpj := public.normalizar_cnpj(p_cnpj);

  if not public.cnpj_valido(v_cnpj) then
    return json_build_object('success', false, 'message', 'CNPJ inválido.');
  end if;

  select id
  into v_empresa
  from public.empresas
  where cnpj = v_cnpj
    and ativo = true;

  if v_empresa is null then
    return json_build_object('success', false, 'message', 'Empresa não encontrada.');
  end if;

  if exists (
    select 1
    from public.empresa_usuarios
    where id_empresa = v_empresa
      and id_usuario = v_usuario
  ) then
    return json_build_object('success', false, 'message', 'Você já possui uma solicitação ou vínculo com esta empresa.');
  end if;

  insert into public.empresa_usuarios (id_empresa, id_usuario, tipo_acesso, aprovado, ativo)
  values (v_empresa, v_usuario, 'tecnico', false, true);

  return json_build_object(
    'success', true,
    'message', 'Solicitação enviada. Aguarde a aprovação do administrador.'
  );

exception
  when unique_violation then
    return json_build_object('success', false, 'message', 'Você já possui uma solicitação ou vínculo com esta empresa.');
end;
$function$;

-- -----------------------------------------------------------------------------
-- P3: aprovar_usuario só aprova pendentes, com matrícula
-- -----------------------------------------------------------------------------

drop function public.aprovar_usuario(bigint, uuid, text);

create function public.aprovar_usuario(
  p_id_empresa bigint,
  p_id_usuario uuid,
  p_tipo_acesso text,
  p_matricula text
)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin uuid;
  v_matricula text;
begin

  v_admin := auth.uid();

  if v_admin is null then
    return json_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  if not public.usuario_admin_empresa(p_id_empresa) then
    return json_build_object('success', false, 'message', 'Você não possui permissão para aprovar usuários.');
  end if;

  if p_tipo_acesso is null or p_tipo_acesso not in ('administrador', 'supervisor', 'tecnico') then
    return json_build_object('success', false, 'message', 'Tipo de acesso inválido.');
  end if;

  v_matricula := nullif(trim(coalesce(p_matricula, '')), '');

  if v_matricula is null then
    return json_build_object('success', false, 'message', 'Matrícula é obrigatória.');
  end if;

  update public.empresa_usuarios
  set
    aprovado = true,
    tipo_acesso = p_tipo_acesso,
    matricula = v_matricula,
    data_aprovacao = now(),
    aprovado_por = v_admin
  where id_empresa = p_id_empresa
    and id_usuario = p_id_usuario
    and aprovado = false
    and ativo = true;

  if not found then
    return json_build_object('success', false, 'message', 'Solicitação pendente não encontrada.');
  end if;

  return json_build_object('success', true, 'message', 'Usuário aprovado com sucesso.');

exception
  when unique_violation then
    return json_build_object('success', false, 'message', 'Matrícula já utilizada nesta empresa.');
end;
$function$;

-- -----------------------------------------------------------------------------
-- P3: alterar_papel_usuario (somente aprovados; nunca remove o último admin)
-- -----------------------------------------------------------------------------

create function public.alterar_papel_usuario(
  p_id_empresa bigint,
  p_id_usuario uuid,
  p_tipo_acesso text
)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_atual text;
begin

  if auth.uid() is null then
    return json_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  if not public.usuario_admin_empresa(p_id_empresa) then
    return json_build_object('success', false, 'message', 'Você não possui permissão para alterar papéis.');
  end if;

  if p_tipo_acesso is null or p_tipo_acesso not in ('administrador', 'supervisor', 'tecnico') then
    return json_build_object('success', false, 'message', 'Tipo de acesso inválido.');
  end if;

  -- Serializa alterações de papel/ativação da mesma empresa
  perform 1 from public.empresas where id = p_id_empresa for update;

  select tipo_acesso
  into v_atual
  from public.empresa_usuarios
  where id_empresa = p_id_empresa
    and id_usuario = p_id_usuario
    and aprovado = true
    and ativo = true;

  if v_atual is null then
    return json_build_object('success', false, 'message', 'Usuário ativo não encontrado nesta empresa.');
  end if;

  if v_atual = p_tipo_acesso then
    return json_build_object('success', true, 'message', 'Papel inalterado.');
  end if;

  if v_atual = 'administrador' and public.contar_admins_ativos(p_id_empresa) <= 1 then
    return json_build_object('success', false, 'message', 'A empresa precisa de pelo menos um administrador ativo.');
  end if;

  update public.empresa_usuarios
  set tipo_acesso = p_tipo_acesso
  where id_empresa = p_id_empresa
    and id_usuario = p_id_usuario;

  return json_build_object('success', true, 'message', 'Papel alterado com sucesso.');

end;
$function$;

-- -----------------------------------------------------------------------------
-- P4: desativar / reativar usuário
-- -----------------------------------------------------------------------------

create function public.desativar_usuario(p_id_empresa bigint, p_id_usuario uuid)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_atual text;
begin

  if auth.uid() is null then
    return json_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  if not public.usuario_admin_empresa(p_id_empresa) then
    return json_build_object('success', false, 'message', 'Você não possui permissão para desativar usuários.');
  end if;

  perform 1 from public.empresas where id = p_id_empresa for update;

  select tipo_acesso
  into v_atual
  from public.empresa_usuarios
  where id_empresa = p_id_empresa
    and id_usuario = p_id_usuario
    and aprovado = true
    and ativo = true;

  if v_atual is null then
    return json_build_object('success', false, 'message', 'Usuário ativo não encontrado nesta empresa.');
  end if;

  if v_atual = 'administrador' and public.contar_admins_ativos(p_id_empresa) <= 1 then
    return json_build_object('success', false, 'message', 'A empresa precisa de pelo menos um administrador ativo.');
  end if;

  update public.empresa_usuarios
  set ativo = false
  where id_empresa = p_id_empresa
    and id_usuario = p_id_usuario;

  return json_build_object('success', true, 'message', 'Usuário desativado.');

end;
$function$;

create function public.reativar_usuario(p_id_empresa bigint, p_id_usuario uuid)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
begin

  if auth.uid() is null then
    return json_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  if not public.usuario_admin_empresa(p_id_empresa) then
    return json_build_object('success', false, 'message', 'Você não possui permissão para reativar usuários.');
  end if;

  update public.empresa_usuarios
  set ativo = true
  where id_empresa = p_id_empresa
    and id_usuario = p_id_usuario
    and aprovado = true
    and ativo = false;

  if not found then
    return json_build_object('success', false, 'message', 'Usuário desativado não encontrado nesta empresa.');
  end if;

  return json_build_object('success', true, 'message', 'Usuário reativado.');

end;
$function$;

-- -----------------------------------------------------------------------------
-- listar_usuarios_empresa: inclui matrícula (somente admin)
-- -----------------------------------------------------------------------------

drop function public.listar_usuarios_empresa(bigint);

create function public.listar_usuarios_empresa(p_id_empresa bigint)
returns table(
  id_usuario uuid,
  nome text,
  email text,
  foto text,
  matricula text,
  tipo_acesso text,
  aprovado boolean,
  ativo boolean,
  data_solicitacao timestamptz,
  data_aprovacao timestamptz
)
language plpgsql
stable security definer
set search_path to ''
as $function$
begin

  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not public.usuario_admin_empresa(p_id_empresa) then
    raise exception 'Você não possui permissão para visualizar os usuários desta empresa.';
  end if;

  return query
  select
    u.id,
    u.nome,
    u.email,
    u.foto,
    eu.matricula,
    eu.tipo_acesso,
    eu.aprovado,
    eu.ativo,
    eu.created_at,
    eu.data_aprovacao
  from public.empresa_usuarios eu
  join public.users u on u.id = eu.id_usuario
  where eu.id_empresa = p_id_empresa
  order by eu.aprovado asc, u.nome asc;

end;
$function$;

-- -----------------------------------------------------------------------------
-- P9: colegas veem apenas nome e foto
-- -----------------------------------------------------------------------------

create function public.listar_colegas_empresa(p_id_empresa bigint)
returns table(id_usuario uuid, nome text, foto text)
language plpgsql
stable security definer
set search_path to ''
as $function$
begin

  if not public.usuario_pertence_empresa(p_id_empresa) then
    raise exception 'Você não possui acesso a esta empresa.';
  end if;

  return query
  select u.id, u.nome, u.foto
  from public.empresa_usuarios eu
  join public.users u on u.id = eu.id_usuario
  where eu.id_empresa = p_id_empresa
    and eu.aprovado = true
    and eu.ativo = true
  order by u.nome asc;

end;
$function$;

-- -----------------------------------------------------------------------------
-- P11: sincroniza e-mail de auth.users para public.users
-- -----------------------------------------------------------------------------

create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin

  update public.users
  set email = coalesce(new.email, '')
  where id = new.id;

  return new;

end;
$function$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- P13/P14: colunas que o cliente pode alterar diretamente
-- users: usuário altera só nome, telefone e foto (e-mail vem do Auth; ativo é do sistema)
-- empresas: admin não altera cnpj nem ativo
-- -----------------------------------------------------------------------------

revoke update on public.users from anon, authenticated;
grant update (nome, telefone, foto) on public.users to authenticated;

revoke update on public.empresas from anon, authenticated;
grant update (
  razao_social, nome_fantasia, email, telefone, endereco, numero,
  complemento, bairro, cidade, estado, cep, logo
) on public.empresas to authenticated;

-- -----------------------------------------------------------------------------
-- P10: performance de RLS e índices
-- -----------------------------------------------------------------------------

drop policy usuario_visualiza_proprio_perfil on public.users;
create policy usuario_visualiza_proprio_perfil on public.users
  for select to authenticated
  using (id = (select auth.uid()));

drop policy usuario_atualiza_proprio_perfil on public.users;
create policy usuario_atualiza_proprio_perfil on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Uma única policy SELECT em empresa_usuarios (antes eram duas permissivas)
drop policy usuario_visualiza_proprio_vinculo on public.empresa_usuarios;
drop policy admin_visualiza_usuarios_empresa on public.empresa_usuarios;
create policy visualiza_vinculos on public.empresa_usuarios
  for select to authenticated
  using (
    id_usuario = (select auth.uid())
    or public.usuario_admin_empresa(id_empresa)
  );

create index idx_empresa_usuarios_aprovado_por
  on public.empresa_usuarios using btree (aprovado_por);

-- -----------------------------------------------------------------------------
-- P7: permissões de execução
-- Funções novas no schema public não recebem EXECUTE automático para anon/PUBLIC.
-- -----------------------------------------------------------------------------

alter default privileges in schema public revoke execute on functions from public, anon;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_user_email_change() from public, anon, authenticated;
revoke all on function public.contar_admins_ativos(bigint) from public, anon, authenticated;

revoke all on function public.normalizar_cnpj(text) from public, anon;
revoke all on function public.cnpj_valido(text) from public, anon;
revoke all on function public.usuario_pertence_empresa(bigint) from public, anon;
revoke all on function public.usuario_admin_empresa(bigint) from public, anon;
revoke all on function public.criar_empresa(text, text, text, text) from public, anon;
revoke all on function public.solicitar_acesso_empresa(text) from public, anon;
revoke all on function public.aprovar_usuario(bigint, uuid, text, text) from public, anon;
revoke all on function public.alterar_papel_usuario(bigint, uuid, text) from public, anon;
revoke all on function public.desativar_usuario(bigint, uuid) from public, anon;
revoke all on function public.reativar_usuario(bigint, uuid) from public, anon;
revoke all on function public.rejeitar_usuario(bigint, uuid) from public, anon;
revoke all on function public.listar_usuarios_empresa(bigint) from public, anon;
revoke all on function public.listar_colegas_empresa(bigint) from public, anon;

grant execute on function public.normalizar_cnpj(text) to authenticated;
grant execute on function public.cnpj_valido(text) to authenticated;
grant execute on function public.usuario_pertence_empresa(bigint) to authenticated;
grant execute on function public.usuario_admin_empresa(bigint) to authenticated;
grant execute on function public.criar_empresa(text, text, text, text) to authenticated;
grant execute on function public.solicitar_acesso_empresa(text) to authenticated;
grant execute on function public.aprovar_usuario(bigint, uuid, text, text) to authenticated;
grant execute on function public.alterar_papel_usuario(bigint, uuid, text) to authenticated;
grant execute on function public.desativar_usuario(bigint, uuid) to authenticated;
grant execute on function public.reativar_usuario(bigint, uuid) to authenticated;
grant execute on function public.rejeitar_usuario(bigint, uuid) to authenticated;
grant execute on function public.listar_usuarios_empresa(bigint) to authenticated;
grant execute on function public.listar_colegas_empresa(bigint) to authenticated;
