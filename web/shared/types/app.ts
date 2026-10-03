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
