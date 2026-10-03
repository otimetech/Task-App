import { expect, test } from 'vitest'
import { mensagemErroAuth } from '../../shared/utils/auth'
import { MENSAGEM_REDE } from '../../shared/utils/rpc'

test('traduz erros conhecidos do Supabase Auth', () => {
  expect(mensagemErroAuth('Invalid login credentials')).toBe('E-mail ou senha incorretos.')
  expect(mensagemErroAuth('Email not confirmed')).toBe('Confirme seu e-mail antes de entrar.')
  expect(mensagemErroAuth('User already registered')).toBe('Já existe uma conta com este e-mail.')
  expect(mensagemErroAuth('Password should be at least 8 characters.')).toBe('A senha deve ter pelo menos 8 caracteres.')
  expect(mensagemErroAuth('TypeError: Failed to fetch')).toBe(MENSAGEM_REDE)
})

test('erro desconhecido vira mensagem genérica', () => {
  expect(mensagemErroAuth('weird')).toBe('Não foi possível concluir. Tente novamente.')
})
