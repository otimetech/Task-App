import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../shared/types/database'
import type { EmpresaTenant, Tenant } from '../../shared/types/app'
import { analisarHost } from '../../shared/utils/host'

// Cache por host do banco: evita consultar resolver_tenant a cada requisição
const TTL_MS = 60_000
const cache = new Map<string, { valor: Tenant; expira: number }>()

async function resolver(hostBanco: string, url: string, key: string): Promise<Tenant> {
  const emCache = cache.get(hostBanco)
  if (emCache && emCache.expira > Date.now()) return emCache.valor

  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } })
  const { data, error } = await supabase.rpc('resolver_tenant', { p_host: hostBanco })
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível conectar. Tente novamente.' })

  const linha = data?.[0] as EmpresaTenant | undefined
  const valor: Tenant = linha ? { contexto: 'empresa', empresa: linha } : { contexto: 'desconhecido' }
  cache.set(hostBanco, { valor, expira: Date.now() + TTL_MS })
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
