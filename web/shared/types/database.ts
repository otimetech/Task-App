// Gerado a partir do banco (MCP supabase generate_typescript_types). Não editar à mão.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      empresa_dominios: {
        Row: {
          created_at: string
          dominio: string
          id: number
          id_empresa: number
          principal: boolean
          tipo: string
          verificado: boolean
        }
        Insert: {
          created_at?: string
          dominio: string
          id?: never
          id_empresa: number
          principal?: boolean
          tipo: string
          verificado?: boolean
        }
        Update: {
          created_at?: string
          dominio?: string
          id?: never
          id_empresa?: number
          principal?: boolean
          tipo?: string
          verificado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "empresa_dominios_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_usuarios: {
        Row: {
          aprovado: boolean
          aprovado_por: string | null
          ativo: boolean
          created_at: string
          data_aprovacao: string | null
          id: number
          id_empresa: number
          id_usuario: string
          matricula: string | null
          tipo_acesso: string
        }
        Insert: {
          aprovado?: boolean
          aprovado_por?: string | null
          ativo?: boolean
          created_at?: string
          data_aprovacao?: string | null
          id?: number
          id_empresa: number
          id_usuario: string
          matricula?: string | null
          tipo_acesso?: string
        }
        Update: {
          aprovado?: boolean
          aprovado_por?: string | null
          ativo?: boolean
          created_at?: string
          data_aprovacao?: string | null
          id?: number
          id_empresa?: number
          id_usuario?: string
          matricula?: string | null
          tipo_acesso?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: number
          logo: string | null
          nome_fantasia: string | null
          numero: string | null
          plano: string | null
          razao_social: string
          responsavel: string | null
          site: string | null
          status_assinatura: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: number
          logo?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          plano?: string | null
          razao_social: string
          responsavel?: string | null
          site?: string | null
          status_assinatura?: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: number
          logo?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          plano?: string | null
          razao_social?: string
          responsavel?: string | null
          site?: string | null
          status_assinatura?: string
          telefone?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          foto: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          foto?: string | null
          id: string
          nome: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          foto?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      alterar_papel_usuario: {
        Args: { p_id_empresa: number; p_id_usuario: string; p_tipo_acesso: string }
        Returns: Json
      }
      alterar_subdominio: {
        Args: { p_id_empresa: number; p_subdominio: string }
        Returns: Json
      }
      aprovar_usuario: {
        Args: { p_id_empresa: number; p_id_usuario: string; p_matricula: string; p_tipo_acesso: string }
        Returns: Json
      }
      cnpj_valido: { Args: { p_cnpj: string }; Returns: boolean }
      contar_admins_ativos: { Args: { p_id_empresa: number }; Returns: number }
      criar_empresa: {
        Args: {
          p_cnpj: string
          p_matricula: string
          p_nome_fantasia: string
          p_razao_social: string
          p_subdominio: string
        }
        Returns: Json
      }
      desativar_usuario: {
        Args: { p_id_empresa: number; p_id_usuario: string }
        Returns: Json
      }
      dominio_base: { Args: never; Returns: string }
      listar_colegas_empresa: {
        Args: { p_id_empresa: number }
        Returns: { foto: string; id_usuario: string; nome: string }[]
      }
      listar_minhas_empresas: {
        Args: never
        Returns: {
          aprovado: boolean
          ativo: boolean
          empresa_ativa: boolean
          id_empresa: number
          logo: string
          nome: string
          pendentes: number
          subdominio: string
          tipo_acesso: string
        }[]
      }
      listar_usuarios_empresa: {
        Args: { p_id_empresa: number }
        Returns: {
          aprovado: boolean
          ativo: boolean
          data_aprovacao: string
          data_solicitacao: string
          email: string
          foto: string
          id_usuario: string
          matricula: string
          nome: string
          tipo_acesso: string
        }[]
      }
      normalizar_cnpj: { Args: { p_cnpj: string }; Returns: string }
      normalizar_subdominio: { Args: { p_subdominio: string }; Returns: string }
      reativar_usuario: {
        Args: { p_id_empresa: number; p_id_usuario: string }
        Returns: Json
      }
      rejeitar_usuario: {
        Args: { p_id_empresa: number; p_id_usuario: string }
        Returns: Json
      }
      resolver_tenant: {
        Args: { p_host: string }
        Returns: {
          cor_primaria: string
          cor_secundaria: string
          id_empresa: number
          logo: string
          nome: string
          subdominio: string
        }[]
      }
      solicitar_acesso_empresa: { Args: { p_cnpj: string }; Returns: Json }
      solicitar_acesso_empresa_por_id: { Args: { p_id_empresa: number }; Returns: Json }
      usuario_admin_empresa: { Args: { p_id_empresa: number }; Returns: boolean }
      usuario_pertence_empresa: { Args: { p_id_empresa: number }; Returns: boolean }
      validar_subdominio: { Args: { p_subdominio: string }; Returns: string }
      verificar_subdominio: { Args: { p_subdominio: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
