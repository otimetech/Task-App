-- =============================================================================
-- Frontend base: bucket de logos e solicitação de acesso pelo id da empresa
-- Spec: docs/superpowers/specs/2026-10-03-frontend-base-design.md (seções 7.1 e 8)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bucket público "logos": leitura pública (login com marca, antes da sessão);
-- escrita só pelo admin da empresa, no caminho {id_empresa}/logo.<ext>
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos', 'logos', true, 1048576,
  array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
);

create policy admin_insere_logo on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] ~ '^[0-9]+$'
    and public.usuario_admin_empresa(((storage.foldername(name))[1])::bigint)
  );

create policy admin_atualiza_logo on storage.objects
  for update to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] ~ '^[0-9]+$'
    and public.usuario_admin_empresa(((storage.foldername(name))[1])::bigint)
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] ~ '^[0-9]+$'
    and public.usuario_admin_empresa(((storage.foldername(name))[1])::bigint)
  );

create policy admin_remove_logo on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] ~ '^[0-9]+$'
    and public.usuario_admin_empresa(((storage.foldername(name))[1])::bigint)
  );

-- O upload com upsert precisa enxergar o objeto existente
create policy admin_visualiza_logo on storage.objects
  for select to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] ~ '^[0-9]+$'
    and public.usuario_admin_empresa(((storage.foldername(name))[1])::bigint)
  );

-- -----------------------------------------------------------------------------
-- solicitar_acesso_empresa_por_id: usada na tela /sem-acesso do subdomínio,
-- sem expor o CNPJ ao frontend. Mesma regra de solicitar_acesso_empresa(cnpj).
-- -----------------------------------------------------------------------------

create function public.solicitar_acesso_empresa_por_id(p_id_empresa bigint)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_usuario uuid;
begin

  v_usuario := auth.uid();

  if v_usuario is null then
    return json_build_object('success', false, 'message', 'Usuário não autenticado.');
  end if;

  if not exists (
    select 1 from public.empresas where id = p_id_empresa and ativo = true
  ) then
    return json_build_object('success', false, 'message', 'Empresa não encontrada.');
  end if;

  if exists (
    select 1
    from public.empresa_usuarios
    where id_empresa = p_id_empresa
      and id_usuario = v_usuario
  ) then
    return json_build_object('success', false, 'message', 'Você já possui uma solicitação ou vínculo com esta empresa.');
  end if;

  insert into public.empresa_usuarios (id_empresa, id_usuario, tipo_acesso, aprovado, ativo)
  values (p_id_empresa, v_usuario, 'tecnico', false, true);

  return json_build_object(
    'success', true,
    'message', 'Solicitação enviada. Aguarde a aprovação do administrador.'
  );

exception
  when unique_violation then
    return json_build_object('success', false, 'message', 'Você já possui uma solicitação ou vínculo com esta empresa.');
end;
$function$;

revoke all on function public.solicitar_acesso_empresa_por_id(bigint) from public, anon;
grant execute on function public.solicitar_acesso_empresa_por_id(bigint) to authenticated;
