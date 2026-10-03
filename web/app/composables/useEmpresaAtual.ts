import type { Vinculo } from '#shared/types/app'
import { ROTULO_PAPEL } from '#shared/utils/menu'

/** Empresa do subdomínio atual + vínculo do usuário com ela + dados de exibição do usuário. */
export function useEmpresaAtual() {
  const { empresa } = useTenant()
  const { vinculos } = useMinhasEmpresas()
  const user = useSupabaseUser()

  const vinculo = computed<Vinculo | null>(
    () => vinculos.value?.find((v) => v.id_empresa === empresa.value?.id_empresa) ?? null,
  )
  const nomeUsuario = computed(() => {
    const meta = (user.value?.user_metadata ?? {}) as { nome?: string }
    return meta.nome || (user.value?.email as string | undefined) || ''
  })

  return {
    empresa,
    vinculo,
    ehAdmin: computed(() => vinculo.value?.tipo_acesso === 'administrador'),
    papel: computed(() => (vinculo.value ? ROTULO_PAPEL[vinculo.value.tipo_acesso] : '')),
    nomeUsuario,
  }
}
