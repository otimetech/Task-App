import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../shared/types/database'
import type { EmpresaTenant, Tenant } from '../../shared/types/app'
import { CacheTtl } from '../../shared/utils/cache'
import { analisarHost } from '../../shared/utils/host'

// Cache por host do banco: evita consultar resolver_tenant a cada requisição
// Limite de itens: hosts arbitrários no header Host não podem crescer a memória
const cache = new CacheTtl<Tenant>(1000, 60_000)

async function resolver(hostBanco: string, url: string, key: string): Promise<Tenant> {
  const emCache = cache.get(hostBanco)
  if (emCache) return emCache

  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } })
  const { data, error } = await supabase.rpc('resolver_tenant', { p_host: hostBanco })
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível conectar. Tente novamente.' })

  const linha = data?.[0] as EmpresaTenant | undefined
  const valor: Tenant = linha ? { contexto: 'empresa', empresa: linha } : { contexto: 'desconhecido' }
  cache.set(hostBanco, valor)
  return valor
}

export default defineEventHandler(async (event) => {
  if (event.path.startsWith('/_nuxt/') || event.path.startsWith('/__nuxt')) return

  const config = useRuntimeConfig(event)
  const contexto = analisarHost(getRequestHost(event, { xForwardedHost: true }), config.public.baseDomain)

  let tenant: Tenant
  if (contexto.tipo === 'raiz') tenant = { contexto: 'raiz' }
  else if (contexto.tipo === 'invalido') tenant = { contexto: 'desconhecido' }
  else tenant = await resolver(contexto.hostBanco, config.public.supabase.url, config.public.supabase.key)

  event.context.tenant = tenant
})
