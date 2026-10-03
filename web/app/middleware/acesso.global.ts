import type { Vinculo } from '#shared/types/app'
import { decidirAcesso } from '#shared/utils/acesso'
import { ErroApp, MENSAGEM_REDE } from '#shared/utils/rpc'

export default defineNuxtRouteMiddleware(async (to) => {
  const { tenant } = useTenant()
  // Empresa inexistente: app.vue já mostra o erro 404
  if (tenant.value.contexto === 'desconhecido') return

  const user = useSupabaseUser()
  const logado = !!user.value
  const contexto = tenant.value.contexto
  const rota = to.path.replace(/\/+$/, '') || '/'

  let vinculo: Vinculo | null = null
  if (logado && tenant.value.contexto === 'empresa') {
    const { carregar, vinculoDaEmpresa } = useMinhasEmpresas()
    try {
      await carregar()
    } catch (e) {
      const mensagem = e instanceof ErroApp ? e.message : MENSAGEM_REDE
      return abortNavigation(createError({ statusCode: 503, statusMessage: mensagem }))
    }
    vinculo = vinculoDaEmpresa(tenant.value.empresa.id_empresa)
  }

  const decisao = decidirAcesso({ rota, logado, contexto, vinculo })
  if (decisao.acao === 'nao-encontrado') {
    return abortNavigation(createError({ statusCode: 404, statusMessage: 'Página não encontrada' }))
  }
  if (decisao.acao === 'redirecionar') {
    if (decisao.aviso && import.meta.client) useToast().erro(decisao.aviso)
    return navigateTo(decisao.para)
  }
})
