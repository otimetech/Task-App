import { MENSAGEM_REDE } from './rpc'

/** Traduz mensagens do Supabase Auth para pt-BR. */
export function mensagemErroAuth(mensagem: string): string {
  if (/invalid login credentials/i.test(mensagem)) return 'E-mail ou senha incorretos.'
  if (/email not confirmed/i.test(mensagem)) return 'Confirme seu e-mail antes de entrar.'
  if (/already registered|already been registered/i.test(mensagem)) return 'Já existe uma conta com este e-mail.'
  if (/password should be at least/i.test(mensagem)) return 'A senha deve ter pelo menos 8 caracteres.'
  if (/failed to fetch|networkerror|fetch failed|load failed/i.test(mensagem)) return MENSAGEM_REDE
  return 'Não foi possível concluir. Tente novamente.'
}
