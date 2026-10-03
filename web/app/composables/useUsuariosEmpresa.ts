import type { UsuarioEmpresa } from '#shared/types/app'
import { ErroApp, rpc } from '#shared/utils/rpc'

/** Gestão de usuários da empresa (somente administrador; regras no banco). */
export function useUsuariosEmpresa(idEmpresa: number) {
  const supabase = useSupabaseClient()
  const { recarregarVinculos } = useMinhasEmpresas()
  const { sucesso, erro } = useToast()

  const usuarios = ref<UsuarioEmpresa[]>([])
  const carregando = ref(false)
  const erroCarga = ref<string | null>(null)

  async function carregar() {
    carregando.value = true
    erroCarga.value = null
    try {
      usuarios.value = (await rpc<UsuarioEmpresa[]>(supabase, 'listar_usuarios_empresa', { p_id_empresa: idEmpresa })) ?? []
    } catch (e) {
      erroCarga.value = e instanceof ErroApp ? e.message : String(e)
    } finally {
      carregando.value = false
    }
  }

  /** Executa a ação; retorna true se deu certo. Recarrega lista e vínculos (o admin pode ter mudado o próprio acesso). */
  async function executar(nome: string, params: Record<string, unknown>): Promise<boolean> {
    try {
      const r = await rpc<{ message: string }>(supabase, nome, { p_id_empresa: idEmpresa, ...params })
      sucesso(r.message)
      return true
    } catch (e) {
      erro(e instanceof ErroApp ? e.message : String(e))
      return false
    } finally {
      await Promise.allSettled([carregar(), recarregarVinculos()])
    }
  }

  return {
    usuarios,
    carregando,
    erroCarga,
    carregar,
    aprovar: (idUsuario: string, tipoAcesso: string, matricula: string) =>
      executar('aprovar_usuario', { p_id_usuario: idUsuario, p_tipo_acesso: tipoAcesso, p_matricula: matricula }),
    rejeitar: (idUsuario: string) => executar('rejeitar_usuario', { p_id_usuario: idUsuario }),
    alterarPapel: (idUsuario: string, tipoAcesso: string) =>
      executar('alterar_papel_usuario', { p_id_usuario: idUsuario, p_tipo_acesso: tipoAcesso }),
    desativar: (idUsuario: string) => executar('desativar_usuario', { p_id_usuario: idUsuario }),
    reativar: (idUsuario: string) => executar('reativar_usuario', { p_id_usuario: idUsuario }),
  }
}
