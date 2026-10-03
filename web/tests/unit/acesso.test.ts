import { describe, expect, test } from 'vitest'
import type { Vinculo } from '../../shared/types/app'
import { decidirAcesso, destinoAposLogin, redirectSeguro, situacaoVinculo } from '../../shared/utils/acesso'

const ativo: Vinculo = {
  id_empresa: 1,
  nome: 'ABC',
  logo: null,
  subdominio: 'abc',
  tipo_acesso: 'tecnico',
  aprovado: true,
  ativo: true,
  empresa_ativa: true,
  pendentes: 0,
}
const admin: Vinculo = { ...ativo, tipo_acesso: 'administrador' }
const pendente: Vinculo = { ...ativo, aprovado: false }
const desativado: Vinculo = { ...ativo, ativo: false }

describe('situacaoVinculo', () => {
  test('classifica', () => {
    expect(situacaoVinculo(null)).toBe('nenhum')
    expect(situacaoVinculo(ativo)).toBe('ativo')
    expect(situacaoVinculo(pendente)).toBe('pendente')
    expect(situacaoVinculo(desativado)).toBe('desativado')
    expect(situacaoVinculo({ ...ativo, empresa_ativa: false })).toBe('desativado')
  })
})

describe('decidirAcesso', () => {
  test('rota pública sem login', () => {
    expect(decidirAcesso({ rota: '/login', logado: false, contexto: 'empresa', vinculo: null })).toEqual({ acao: 'liberar' })
  })

  test('logado em /login vai ao destino padrão', () => {
    expect(decidirAcesso({ rota: '/login', logado: true, contexto: 'raiz', vinculo: null })).toEqual({
      acao: 'redirecionar',
      para: '/empresas',
    })
    expect(decidirAcesso({ rota: '/login', logado: true, contexto: 'empresa', vinculo: ativo })).toEqual({
      acao: 'redirecionar',
      para: '/',
    })
  })

  test('redefinir senha não redireciona logado', () => {
    expect(decidirAcesso({ rota: '/redefinir-senha', logado: true, contexto: 'raiz', vinculo: null })).toEqual({
      acao: 'liberar',
    })
  })

  test('sem login vai para /login com redirect', () => {
    expect(decidirAcesso({ rota: '/usuarios', logado: false, contexto: 'empresa', vinculo: null })).toEqual({
      acao: 'redirecionar',
      para: '/login?redirect=%2Fusuarios',
    })
  })

  test('raiz: / vai para /empresas', () => {
    expect(decidirAcesso({ rota: '/', logado: true, contexto: 'raiz', vinculo: null })).toEqual({
      acao: 'redirecionar',
      para: '/empresas',
    })
  })

  test('rotas de empresa na raiz e vice-versa dão 404', () => {
    expect(decidirAcesso({ rota: '/usuarios', logado: true, contexto: 'raiz', vinculo: null })).toEqual({
      acao: 'nao-encontrado',
    })
    expect(decidirAcesso({ rota: '/empresas', logado: true, contexto: 'empresa', vinculo: ativo })).toEqual({
      acao: 'nao-encontrado',
    })
    expect(decidirAcesso({ rota: '/qualquer', logado: true, contexto: 'raiz', vinculo: null })).toEqual({
      acao: 'nao-encontrado',
    })
  })

  test('sem vínculo ativo vai para /sem-acesso', () => {
    expect(decidirAcesso({ rota: '/', logado: true, contexto: 'empresa', vinculo: null })).toEqual({
      acao: 'redirecionar',
      para: '/sem-acesso',
    })
    expect(decidirAcesso({ rota: '/usuarios', logado: true, contexto: 'empresa', vinculo: pendente })).toEqual({
      acao: 'redirecionar',
      para: '/sem-acesso',
    })
    expect(decidirAcesso({ rota: '/', logado: true, contexto: 'empresa', vinculo: desativado })).toEqual({
      acao: 'redirecionar',
      para: '/sem-acesso',
    })
  })

  test('rotas de admin', () => {
    expect(decidirAcesso({ rota: '/usuarios', logado: true, contexto: 'empresa', vinculo: ativo })).toEqual({
      acao: 'redirecionar',
      para: '/',
      aviso: 'Acesso restrito a administradores.',
    })
    expect(decidirAcesso({ rota: '/usuarios', logado: true, contexto: 'empresa', vinculo: admin })).toEqual({
      acao: 'liberar',
    })
  })

  test('/sem-acesso', () => {
    expect(decidirAcesso({ rota: '/sem-acesso', logado: true, contexto: 'empresa', vinculo: null })).toEqual({
      acao: 'liberar',
    })
    expect(decidirAcesso({ rota: '/sem-acesso', logado: true, contexto: 'empresa', vinculo: ativo })).toEqual({
      acao: 'redirecionar',
      para: '/',
    })
  })
})

describe('redirectSeguro', () => {
  test('bloqueia externos', () => {
    expect(redirectSeguro('https://evil.com')).toBeNull()
    expect(redirectSeguro('//evil.com')).toBeNull()
    expect(redirectSeguro('/\\evil.com')).toBeNull()
    expect(redirectSeguro(undefined)).toBeNull()
  })
  test('aceita interno', () => {
    expect(redirectSeguro('/usuarios')).toBe('/usuarios')
  })
})

describe('destinoAposLogin', () => {
  test('raiz com um vínculo ativo vai à empresa', () => {
    expect(destinoAposLogin({ contexto: 'raiz', vinculos: [ativo], redirect: null })).toEqual({ tipo: 'empresa', slug: 'abc' })
  })
  test('raiz com dois vínculos ativos vai a /empresas', () => {
    expect(
      destinoAposLogin({ contexto: 'raiz', vinculos: [ativo, { ...ativo, id_empresa: 2, subdominio: 'xyz' }], redirect: null }),
    ).toEqual({ tipo: 'interno', caminho: '/empresas' })
  })
  test('raiz com pendente vai a /empresas', () => {
    expect(destinoAposLogin({ contexto: 'raiz', vinculos: [pendente], redirect: null })).toEqual({
      tipo: 'interno',
      caminho: '/empresas',
    })
  })
  test('empresa ignora redirect externo', () => {
    expect(destinoAposLogin({ contexto: 'empresa', vinculos: [], redirect: 'https://evil.com' })).toEqual({
      tipo: 'interno',
      caminho: '/',
    })
  })
  test('empresa respeita redirect interno', () => {
    expect(destinoAposLogin({ contexto: 'empresa', vinculos: [], redirect: '/usuarios' })).toEqual({
      tipo: 'interno',
      caminho: '/usuarios',
    })
  })
})
