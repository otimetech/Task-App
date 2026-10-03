import { expect, test } from 'vitest'
import { ErroApp, MENSAGEM_REDE, rpc } from '../../shared/utils/rpc'

function fake(resposta: { data?: unknown; error?: { message: string } | null }) {
  return { rpc: async () => ({ data: resposta.data ?? null, error: resposta.error ?? null }) }
}

function fakeThrow(erro: Error) {
  return {
    rpc: async (): Promise<{ data: unknown; error: null }> => {
      throw erro
    },
  }
}

test('retorna data em sucesso', async () => {
  await expect(rpc(fake({ data: { success: true, id_empresa: 1 } }), 'x')).resolves.toEqual({ success: true, id_empresa: 1 })
})

test('retorna linhas de funções returns table', async () => {
  await expect(rpc(fake({ data: [{ id: 1 }] }), 'x')).resolves.toEqual([{ id: 1 }])
})

test('success false vira erro de regra', async () => {
  await expect(rpc(fake({ data: { success: false, message: 'CNPJ inválido.' } }), 'x')).rejects.toMatchObject({
    message: 'CNPJ inválido.',
    tipo: 'regra',
  })
})

test('error do supabase vira erro de regra', async () => {
  const p = rpc(fake({ error: { message: 'Você não possui permissão para visualizar os usuários desta empresa.' } }), 'x')
  await expect(p).rejects.toBeInstanceOf(ErroApp)
  await expect(p).rejects.toMatchObject({ tipo: 'regra' })
})

test('falha de rede no error', async () => {
  await expect(rpc(fake({ error: { message: 'TypeError: Failed to fetch' } }), 'x')).rejects.toMatchObject({
    message: MENSAGEM_REDE,
    tipo: 'rede',
  })
})

test('exceção do fetch vira erro de rede', async () => {
  await expect(rpc(fakeThrow(new TypeError('fetch failed')), 'x')).rejects.toMatchObject({ tipo: 'rede' })
})
