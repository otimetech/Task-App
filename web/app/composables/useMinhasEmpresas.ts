import type { Vinculo } from '#shared/types/app'
import { rpc } from '#shared/utils/rpc'

/** Vínculos do usuário logado (listar_minhas_empresas), em cache por usuário. */
export function useMinhasEmpresas() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const cache = useState<{ usuario: string | null; lista: Vinculo[] | null }>('vinculos', () => ({
    usuario: null,
    lista: null,
  }))

  const idUsuario = () => (user.value?.sub as string | undefined) ?? (user.value as { id?: string } | null)?.id ?? null

  async function recarregarVinculos(): Promise<Vinculo[]> {
    const lista = await rpc<Vinculo[]>(supabase, 'listar_minhas_empresas')
    cache.value = { usuario: idUsuario(), lista: lista ?? [] }
    return cache.value.lista!
  }

  async function carregar(): Promise<Vinculo[]> {
    if (cache.value.lista && cache.value.usuario === idUsuario()) return cache.value.lista
    return recarregarVinculos()
  }

  return {
    vinculos: computed(() => cache.value.lista),
    carregar,
    recarregarVinculos,
    vinculoDaEmpresa: (id: number) => cache.value.lista?.find((v) => v.id_empresa === id) ?? null,
    limpar: () => {
      cache.value = { usuario: null, lista: null }
    },
  }
}
