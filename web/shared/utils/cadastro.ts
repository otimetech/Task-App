/**
 * Supabase Auth não revela se o e-mail já tem conta: para conta existente, signUp
 * responde sucesso, sem sessão, e com `user.identities` vazio.
 */
export function cadastroJaExiste(resposta: { user: { identities?: unknown[] | null } | null; session: unknown }): boolean {
  return !!resposta.user && !resposta.session && Array.isArray(resposta.user.identities) && resposta.user.identities.length === 0
}

export function textoPendentes(n: number): string {
  if (!n) return ''
  return n === 1 ? '1 solicitação pendente' : `${n} solicitações pendentes`
}
