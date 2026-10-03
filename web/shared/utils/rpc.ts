export const MENSAGEM_REDE = 'Não foi possível conectar. Tente novamente.'

export class ErroApp extends Error {
  constructor(
    message: string,
    public tipo: 'regra' | 'rede',
  ) {
    super(message)
    this.name = 'ErroApp'
  }
}

type ClienteRpc = {
  rpc: (nome: string, params?: object) => PromiseLike<{ data: unknown; error: { message: string } | null }>
}

const PADRAO_REDE = /failed to fetch|networkerror|fetch failed|load failed/i

/**
 * Chama uma função do banco. Lança ErroApp com a mensagem do banco quando
 * a função retorna { success: false } ou o Supabase devolve erro.
 */
export async function rpc<T = unknown>(cliente: ClienteRpc, nome: string, params?: object): Promise<T> {
  let resposta: { data: unknown; error: { message: string } | null }
  try {
    resposta = await cliente.rpc(nome, params)
  } catch {
    throw new ErroApp(MENSAGEM_REDE, 'rede')
  }

  const { data, error } = resposta
  if (error) {
    if (PADRAO_REDE.test(error.message)) throw new ErroApp(MENSAGEM_REDE, 'rede')
    throw new ErroApp(error.message, 'regra')
  }

  if (data && typeof data === 'object' && !Array.isArray(data) && (data as { success?: unknown }).success === false) {
    throw new ErroApp(String((data as { message?: unknown }).message ?? 'Operação não realizada.'), 'regra')
  }

  return data as T
}
