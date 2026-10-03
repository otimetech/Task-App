// Espelho de public.normalizar_subdominio / public.validar_subdominio (migration branding_dominios)

export const SUBDOMINIOS_RESERVADOS = [
  'www', 'app', 'api', 'admin', 'painel', 'login', 'auth', 'conta', 'cadastro',
  'mail', 'email', 'smtp', 'imap', 'pop', 'ftp', 'ns1', 'ns2',
  'static', 'cdn', 'assets', 'img', 'files', 'storage',
  'suporte', 'ajuda', 'help', 'status', 'blog', 'docs',
  'dev', 'staging', 'homolog', 'teste', 'test', 'demo',
  'manutgo', 'otimetech',
] as const

export function normalizarSubdominio(v: string): string {
  return (v ?? '').trim().toLowerCase()
}

/** Retorna null se válido, ou a mensagem de erro (mesmas mensagens do banco). */
export function validarSubdominio(v: string): string | null {
  if (!v) return 'Subdomínio é obrigatório.'
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(v)) {
    return 'Subdomínio deve ter de 3 a 63 caracteres: letras minúsculas, números e hífen (sem hífen no início ou no fim).'
  }
  if ((SUBDOMINIOS_RESERVADOS as readonly string[]).includes(v)) return 'Este subdomínio é reservado.'
  return null
}
