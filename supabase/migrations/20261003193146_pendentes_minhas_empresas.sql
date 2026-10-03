-- =============================================================================
-- listar_minhas_empresas passa a informar quantas solicitações pendentes a
-- empresa tem (somente para quem é administrador ativo dela; demais = 0).
-- Usado em "Minhas empresas" e no contador do menu Usuários.
-- =============================================================================

drop function public.listar_minhas_empresas();

create function public.listar_minhas_empresas()
returns table (
  id_empresa bigint,
  nome text,
  logo text,
  subdominio text,
  tipo_acesso text,
  aprovado boolean,
  ativo boolean,
  empresa_ativa boolean,
  pendentes integer
)
language sql
stable
security definer
set search_path to ''
as $function$
  select e.id, coalesce(e.nome_fantasia, e.razao_social), e.logo, d.dominio,
         eu.tipo_acesso, eu.aprovado, eu.ativo, e.ativo,
         case
           when eu.tipo_acesso = 'administrador' and eu.aprovado and eu.ativo and e.ativo then (
             select count(*)::integer
             from public.empresa_usuarios p
             where p.id_empresa = e.id and p.aprovado = false
           )
           else 0
         end
  from public.empresa_usuarios eu
  join public.empresas e on e.id = eu.id_empresa
  left join public.empresa_dominios d
    on d.id_empresa = e.id and d.tipo = 'subdominio'
  where eu.id_usuario = (select auth.uid())
  order by coalesce(e.nome_fantasia, e.razao_social);
$function$;

revoke all on function public.listar_minhas_empresas() from public, anon;
grant execute on function public.listar_minhas_empresas() to authenticated;
