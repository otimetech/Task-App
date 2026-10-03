import type { Vinculo } from '../types/app'

export const ROTAS_PUBLICAS = ['/login', '/cadastro', '/recuperar-senha', '/redefinir-senha']
export const ROTAS_RAIZ = ['/empresas', '/empresas/nova', '/empresas/solicitar']
export const ROTAS_EMPRESA = ['/', '/sem-acesso', '/usuarios', '/configuracoes']
export const ROTAS_ADMIN = ['/usuarios', '/configuracoes']

// Páginas públicas de onde um usuário logado sai para o destino padrão
const PUBLICAS_SO_DESLOGADO = ['/login', '/cadastro', '/recuperar-senha']

export type SituacaoVinculo = 'nenhum' | 'pendente' | 'desativado' | 'ativo'

export type Decisao =
  | { acao: 'liberar' }
  | { acao: 'redirecionar'; para: string; aviso?: string }
  | { acao: 'nao-encontrado' }

export type Destino = { tipo: 'interno'; caminho: string } | { tipo: 'empresa'; slug: string }

export function situacaoVinculo(v: Vinculo | null): SituacaoVinculo {
  if (!v) return 'nenhum'
  if (!v.aprovado) return 'pendente'
  if (v.ativo && v.empresa_ativa) return 'ativo'
  return 'desativado'
}

export function decidirAcesso(e: {
  rota: string
  logado: boolean
  contexto: 'raiz' | 'empresa'
  vinculo: Vinculo | null
}): Decisao {
  const destinoPadrao = e.contexto === 'raiz' ? '/empresas' : '/'

  if (ROTAS_PUBLICAS.includes(e.rota)) {
    if (e.logado && PUBLICAS_SO_DESLOGADO.includes(e.rota)) return { acao: 'redirecionar', para: destinoPadrao }
    return { acao: 'liberar' }
  }

  if (e.contexto === 'raiz') {
    if (e.rota === '/') return e.logado ? { acao: 'redirecionar', para: '/empresas' } : login(e.rota)
    if (!ROTAS_RAIZ.includes(e.rota)) return { acao: 'nao-encontrado' }
    return e.logado ? { acao: 'liberar' } : login(e.rota)
  }

  if (!ROTAS_EMPRESA.includes(e.rota)) return { acao: 'nao-encontrado' }
  if (!e.logado) return login(e.rota)

  const ativo = situacaoVinculo(e.vinculo) === 'ativo'
  if (e.rota === '/sem-acesso') return ativo ? { acao: 'redirecionar', para: '/' } : { acao: 'liberar' }
  if (!ativo) return { acao: 'redirecionar', para: '/sem-acesso' }
  if (ROTAS_ADMIN.includes(e.rota) && e.vinculo!.tipo_acesso !== 'administrador') {
    return { acao: 'redirecionar', para: '/', aviso: 'Acesso restrito a administradores.' }
  }
  return { acao: 'liberar' }
}

function login(rota: string): Decisao {
  return { acao: 'redirecionar', para: `/login?redirect=${encodeURIComponent(rota)}` }
}

/** Aceita só caminhos internos ("/x"); bloqueia "//host", "/\host" e URLs absolutas. */
export function redirectSeguro(valor: unknown): string | null {
  if (typeof valor !== 'string' || !valor.startsWith('/')) return null
  if (valor.startsWith('//') || valor.includes('\\')) return null
  return valor
}

export function destinoAposLogin(e: { contexto: 'raiz' | 'empresa'; vinculos: Vinculo[]; redirect: unknown }): Destino {
  if (e.contexto === 'empresa') return { tipo: 'interno', caminho: redirectSeguro(e.redirect) ?? '/' }

  const ativos = e.vinculos.filter((v) => situacaoVinculo(v) === 'ativo' && v.subdominio)
  if (ativos.length === 1) return { tipo: 'empresa', slug: ativos[0]!.subdominio! }
  return { tipo: 'interno', caminho: redirectSeguro(e.redirect) ?? '/empresas' }
}
