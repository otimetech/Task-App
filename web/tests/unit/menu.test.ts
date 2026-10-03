import { expect, test } from 'vitest'
import { ITENS_BOTTOM_NAV, itensMenu } from '../../shared/utils/menu'

test('administrador vê Usuários e Configurações', () => {
  const ids = itensMenu(true).map((i) => i.id)
  expect(ids).toContain('usuarios')
  expect(ids).toContain('configuracoes')
  expect(ids[0]).toBe('inicio')
})

test('não administrador não vê itens de admin', () => {
  const ids = itensMenu(false).map((i) => i.id)
  expect(ids).not.toContain('usuarios')
  expect(ids).not.toContain('configuracoes')
})

test('módulos futuros ficam sem rota (em breve)', () => {
  const equipamentos = itensMenu(false).find((i) => i.id === 'equipamentos')
  expect(equipamentos?.rota).toBeNull()
})

test('bottom nav na ordem do escopo', () => {
  expect(ITENS_BOTTOM_NAV.map((i) => i.rotulo)).toEqual(['Início', 'O.S.', 'Agenda', 'Clientes', 'Mais'])
})
