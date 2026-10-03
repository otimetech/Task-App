import { expect, test } from 'vitest'
import { cnpjValido, mascararCnpj, normalizarCnpj } from '../../shared/utils/cnpj'

// Casos conferidos com public.cnpj_valido em 2026-10-03
test.each(['11.222.333/0001-81', '11444777000161', '12.ABC.345/01DE-35', '12abc34501de35'])('%s é válido', (v) => {
  expect(cnpjValido(v)).toBe(true)
})

test.each(['11222333000182', '00000000000000', '1122233300018', '11.222.333/0001-8A', ''])('%s é inválido', (v) => {
  expect(cnpjValido(v)).toBe(false)
})

test('normaliza para maiúsculas sem máscara', () => {
  expect(normalizarCnpj('12.abc.345/01de-35')).toBe('12ABC34501DE35')
})

test('máscara completa', () => {
  expect(mascararCnpj('12abc34501de35')).toBe('12.ABC.345/01DE-35')
})

test('máscara progressiva', () => {
  expect(mascararCnpj('11222')).toBe('11.222')
  expect(mascararCnpj('112223330001')).toBe('11.222.333/0001')
})
