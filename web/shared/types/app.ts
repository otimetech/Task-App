export type EmpresaTenant = {
  id_empresa: number
  nome: string
  logo: string | null
  cor_primaria: string | null
  cor_secundaria: string | null
  subdominio: string | null
}

export type Tenant =
  | { contexto: 'raiz' }
  | { contexto: 'empresa'; empresa: EmpresaTenant }
  | { contexto: 'desconhecido' }

/** Linha de public.listar_minhas_empresas() */
export type Vinculo = {
  id_empresa: number
  nome: string
  logo: string | null
  subdominio: string | null
  tipo_acesso: 'administrador' | 'supervisor' | 'tecnico'
  aprovado: boolean
  ativo: boolean
  empresa_ativa: boolean
}

/** Linha de public.listar_usuarios_empresa() */
export type UsuarioEmpresa = {
  id_usuario: string
  nome: string
  email: string
  foto: string | null
  matricula: string | null
  tipo_acesso: 'administrador' | 'supervisor' | 'tecnico'
  aprovado: boolean
  ativo: boolean
  data_solicitacao: string
  data_aprovacao: string | null
}
