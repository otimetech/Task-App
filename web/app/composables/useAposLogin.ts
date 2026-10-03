import { destinoAposLogin } from '#shared/utils/acesso'

/** Depois de login/cadastro com sessão: atualiza usuário e vínculos e vai ao destino (spec 5.4). */
export function useAposLogin() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const { recarregarVinculos } = useMinhasEmpresas()
  const { tenant, urlDaEmpresa } = useTenant()

  return async (redirect: unknown) => {
    // O plugin do módulo atualiza o usuário de forma assíncrona; garante antes de navegar
    const { data } = await supabase.auth.getClaims()
    user.value = data?.claims ?? null

    const vinculos = await recarregarVinculos()
    const destino = destinoAposLogin({
      contexto: tenant.value.contexto === 'raiz' ? 'raiz' : 'empresa',
      vinculos,
      redirect,
    })
    if (destino.tipo === 'empresa') return navigateTo(urlDaEmpresa(destino.slug), { external: true })
    return navigateTo(destino.caminho)
  }
}
