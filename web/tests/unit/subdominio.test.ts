import { expect, test } from 'vitest'
import { normalizarSubdominio, SUBDOMINIOS_RESERVADOS, validarSubdominio } from '../../shared/utils/subdominio'

test('vazio é obrigatório', () => {
  expect(validarSubdominio('')).toBe('Subdomínio é obrigatório.')
})

test('curto demais', () => {
  expect(validarSubdominio('ab')).toBe(
    'Subdomínio deve ter de 3 a 63 caracteres: letras minúsculas, números e hífen (sem hífen no início ou no fim).',
  )
})

test('hífen no início ou no fim', () => {
  expect(validarSubdominio('-abc')).not.toBeNull()
  expect(validarSubdominio('abc-')).not.toBeNull()
})

test('reservado', () => {
  expect(validarSubdominio('www')).toBe('Este subdomínio é reservado.')
  expect(SUBDOMINIOS_RESERVADOS).toContain('manutgo')
})

test('válido', () => {
  expect(validarSubdominio('empresa-abc')).toBeNull()
})

test('normaliza', () => {
  expect(normalizarSubdominio('  Empresa-ABC ')).toBe('empresa-abc')
})
