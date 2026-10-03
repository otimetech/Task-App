import { expect, test } from 'vitest'
import { CacheTtl } from '../../shared/utils/cache'

test('expira e remove a entrada vencida', () => {
  let agora = 0
  const c = new CacheTtl<string>(10, 1000, () => agora)
  c.set('a', 'x')
  expect(c.get('a')).toBe('x')
  agora = 1001
  expect(c.get('a')).toBeUndefined()
  expect(c.tamanho).toBe(0)
})

test('nunca passa do limite: descarta a entrada menos usada', () => {
  const c = new CacheTtl<number>(3, 60_000)
  c.set('a', 1)
  c.set('b', 2)
  c.set('c', 3)
  c.get('a') // a vira a mais recente
  c.set('d', 4)
  expect(c.tamanho).toBe(3)
  expect(c.get('b')).toBeUndefined()
  expect(c.get('a')).toBe(1)
})

test('muitos hosts aleatórios não crescem a memória', () => {
  const c = new CacheTtl<number>(1000, 60_000)
  for (let i = 0; i < 50_000; i++) c.set(`h${i}.x`, i)
  expect(c.tamanho).toBe(1000)
})
