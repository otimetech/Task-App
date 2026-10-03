import type { Tenant } from '#shared/types/app'

// Copia o tenant resolvido no servidor (server/middleware/tenant.ts) para o estado do app
export default defineNuxtPlugin(() => {
  const tenant = useState<Tenant>('tenant', () => ({ contexto: 'raiz' }))
  if (import.meta.server) {
    const event = useRequestEvent()
    if (event?.context.tenant) tenant.value = event.context.tenant as Tenant
  }
})
