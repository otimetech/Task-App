// Domínio base gravado no banco (public.dominio_base()). Subdomínios são consultados sempre com ele.
export const DOMINIO_BASE_BANCO = 'manutgo.otimetech.com.br'

export type ContextoHost =
  | { tipo: 'raiz' }
  | { tipo: 'subdominio'; slug: string; hostBanco: string }
  | { tipo: 'proprio'; hostBanco: string }
  | { tipo: 'invalido' }

const DOMINIOS_HTTP = ['localhost', 'lvh.me']

/** Minúsculas, sem porta, sem ponto final. */
export function normalizarHost(host: string): string {
  return (host ?? '').trim().toLowerCase().split(':')[0]!.replace(/\.+$/, '')
}

function porta(host: string): string {
  const partes = (host ?? '').trim().replace(/\.+$/, '').split(':')
  return partes.length > 1 && partes[1] ? `:${partes[1]}` : ''
}

export function analisarHost(host: string, baseDomain: string): ContextoHost {
  const h = normalizarHost(host)
  const base = normalizarHost(baseDomain)

  if (!h) return { tipo: 'invalido' }
  if (h === base) return { tipo: 'raiz' }

  const sufixo = `.${base}`
  if (h.endsWith(sufixo)) {
    const slug = h.slice(0, -sufixo.length)
    if (!slug || slug.includes('.')) return { tipo: 'invalido' }
    return { tipo: 'subdominio', slug, hostBanco: `${slug}.${DOMINIO_BASE_BANCO}` }
  }

  if (!h.includes('.')) return { tipo: 'invalido' }
  return { tipo: 'proprio', hostBanco: h }
}

function protocolo(baseDomain: string): string {
  return DOMINIOS_HTTP.includes(normalizarHost(baseDomain)) ? 'http' : 'https'
}

export function montarUrlEmpresa(slug: string, hostAtual: string, baseDomain: string, caminho = '/'): string {
  const base = normalizarHost(baseDomain)
  return `${protocolo(base)}://${slug}.${base}${porta(hostAtual)}${caminho}`
}

export function montarUrlRaiz(hostAtual: string, baseDomain: string, caminho = '/'): string {
  const base = normalizarHost(baseDomain)
  return `${protocolo(base)}://${base}${porta(hostAtual)}${caminho}`
}
