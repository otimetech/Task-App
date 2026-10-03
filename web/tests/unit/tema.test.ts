import { expect, test } from 'vitest'
import { estiloTema, gerarVariaveisTema } from '../../shared/utils/tema'

test('sem cores não gera variáveis', () => {
  expect(gerarVariaveisTema({ cor_primaria: null, cor_secundaria: null })).toEqual({})
})

test('primária gera família brand', () => {
  const v = gerarVariaveisTema({ cor_primaria: '#AA0000', cor_secundaria: null })
  expect(v['--brand-700']).toBe('#AA0000')
  expect(v['--brand-900']).toBe('color-mix(in srgb, #AA0000 55%, black)')
  expect(v['--brand-600']).toBe('color-mix(in srgb, #AA0000 85%, white)')
  expect(v['--brand-100']).toBe('color-mix(in srgb, #AA0000 22%, white)')
  expect(v['--brand-50']).toBe('color-mix(in srgb, #AA0000 8%, white)')
  expect(v['--brand-50-border']).toBe('color-mix(in srgb, #AA0000 12%, white)')
})

test('secundária substitui brand-600', () => {
  expect(gerarVariaveisTema({ cor_primaria: '#AA0000', cor_secundaria: '#00AA00' })['--brand-600']).toBe('#00AA00')
})

test('secundária sem primária', () => {
  expect(gerarVariaveisTema({ cor_primaria: null, cor_secundaria: '#00AA00' })).toEqual({ '--brand-600': '#00AA00' })
})

test('cores inválidas são ignoradas', () => {
  expect(gerarVariaveisTema({ cor_primaria: 'azul', cor_secundaria: 'red' })).toEqual({})
})

test('estiloTema serializa variáveis', () => {
  expect(estiloTema({ '--brand-700': '#AA0000' })).toBe('--brand-700:#AA0000')
  expect(estiloTema({})).toBe('')
})
