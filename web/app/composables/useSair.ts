/** Encerra a sessão, limpa vínculos em cache e volta ao login. */
export function useSair() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const { limpar } = useMinhasEmpresas()

  return async () => {
    await supabase.auth.signOut()
    limpar()
    user.value = null
    await navigateTo('/login')
  }
}
