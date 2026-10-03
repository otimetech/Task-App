import { expect, test } from 'vitest'
import { cadastroJaExiste, textoPendentes } from '../../shared/utils/cadastro'

test('signUp de e-mail já cadastrado volta usuário sem identidades', () => {
  expect(cadastroJaExiste({ user: { identities: [] }, session: null })).toBe(true)
})

test('cadastro novo tem identidade', () => {
  expect(cadastroJaExiste({ user: { identities: [{ id: '1' }] }, session: null })).toBe(false)
})

test('sem usuário não é conta existente', () => {
  expect(cadastroJaExiste({ user: null, session: null })).toBe(false)
})

test('texto de pendentes', () => {
  expect(textoPendentes(0)).toBe('')
  expect(textoPendentes(1)).toBe('1 solicitação pendente')
  expect(textoPendentes(3)).toBe('3 solicitações pendentes')
})
