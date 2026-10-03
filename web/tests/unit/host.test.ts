import { describe, expect, test } from 'vitest'
import { analisarHost, montarUrlEmpresa, montarUrlRaiz } from '../../shared/utils/host'

describe('analisarHost', () => {
  test('localhost é raiz', () => {
    expect(analisarHost('localhost:3000', 'localhost')).toEqual({ tipo: 'raiz' })
  })

  test('domínio base de produção é raiz', () => {
    expect(analisarHost('manutgo.otimetech.com.br', 'manutgo.otimetech.com.br')).toEqual({ tipo: 'raiz' })
  })

  test('maiúsculas, porta e ponto final viram o mesmo subdomínio', () => {
    expect(analisarHost('ABC.localhost:3000.', 'localhost')).toEqual({
      tipo: 'subdominio',
      slug: 'abc',
      hostBanco: 'abc.manutgo.otimetech.com.br',
    })
  })

  test('subdomínio em produção', () => {
    expect(analisarHost('abc.manutgo.otimetech.com.br', 'manutgo.otimetech.com.br')).toEqual({
      tipo: 'subdominio',
      slug: 'abc',
      hostBanco: 'abc.manutgo.otimetech.com.br',
    })
  })

  test('mais de um nível é inválido', () => {
    expect(analisarHost('x.abc.localhost', 'localhost')).toEqual({ tipo: 'invalido' })
  })

  test('domínio externo é próprio', () => {
    expect(analisarHost('os.cliente.com.br', 'manutgo.otimetech.com.br')).toEqual({
      tipo: 'proprio',
      hostBanco: 'os.cliente.com.br',
    })
  })

  test('host vazio é inválido', () => {
    expect(analisarHost('', 'localhost')).toEqual({ tipo: 'invalido' })
  })
})

describe('montarUrl', () => {
  test('empresa em dev preserva porta e usa http', () => {
    expect(montarUrlEmpresa('abc', 'localhost:3000', 'localhost', '/usuarios')).toBe('http://abc.localhost:3000/usuarios')
  })

  test('empresa em produção usa https', () => {
    expect(montarUrlEmpresa('abc', 'manutgo.otimetech.com.br', 'manutgo.otimetech.com.br')).toBe(
      'https://abc.manutgo.otimetech.com.br/',
    )
  })

  test('raiz a partir de subdomínio', () => {
    expect(montarUrlRaiz('abc.localhost:3000', 'localhost', '/empresas')).toBe('http://localhost:3000/empresas')
  })
})
