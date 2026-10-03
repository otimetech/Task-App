import type { EmpresaTenant, Tenant } from '#shared/types/app'
import type { CoresEmpresa } from '#shared/utils/tema'
import { montarUrlEmpresa, montarUrlRaiz } from '#shared/utils/host'

export function useTenant() {
  const tenant = useState<Tenant>('tenant', () => ({ contexto: 'raiz' }))
  const config = useRuntimeConfig()
  const hostAtual = useRequestURL().host

  const empresa = computed<EmpresaTenant | null>(() =>
    tenant.value.contexto === 'empresa' ? tenant.value.empresa : null,
  )
  const ehRaiz = computed(() => tenant.value.contexto === 'raiz')

  // Cores em uso: começam pelas da empresa; Configurações pode trocar na hora (prévia/salvar)
  const cores = useState<CoresEmpresa>('tema-cores', () => ({
    cor_primaria: empresa.value?.cor_primaria ?? null,
    cor_secundaria: empresa.value?.cor_secundaria ?? null,
  }))

  const urlLogo = computed(() =>
    empresa.value?.logo ? `${config.public.supabase.url}/storage/v1/object/public/logos/${empresa.value.logo}` : null,
  )

  return {
    tenant,
    empresa,
    ehRaiz,
    cores,
    urlLogo,
    urlDaEmpresa: (slug: string, caminho = '/') => montarUrlEmpresa(slug, hostAtual, config.public.baseDomain, caminho),
    urlDaRaiz: (caminho = '/') => montarUrlRaiz(hostAtual, config.public.baseDomain, caminho),
    aplicarCores: (novas: CoresEmpresa) => {
      cores.value = { ...novas }
    },
    /** Atualiza dados da empresa atual no estado (após salvar em Configurações). */
    atualizarEmpresa: (parcial: Partial<EmpresaTenant>) => {
      if (tenant.value.contexto === 'empresa') {
        tenant.value = { contexto: 'empresa', empresa: { ...tenant.value.empresa, ...parcial } }
      }
    },
  }
}
