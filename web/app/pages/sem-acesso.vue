<script setup lang="ts">
import { situacaoVinculo } from '#shared/utils/acesso'
import { ErroApp, rpc } from '#shared/utils/rpc'

definePageMeta({ layout: 'publico' })

const supabase = useSupabaseClient()
const { empresa, urlDaRaiz } = useTenant()
const { vinculoDaEmpresa, recarregarVinculos } = useMinhasEmpresas()
const { sucesso, erro: toastErro } = useToast()
const sair = useSair()

const situacao = ref(situacaoVinculo(empresa.value ? vinculoDaEmpresa(empresa.value.id_empresa) : null))
const carregando = ref(false)

const nome = computed(() => empresa.value?.nome ?? 'esta empresa')

async function solicitar() {
  if (!empresa.value) return
  carregando.value = true
  try {
    const r = await rpc<{ message: string }>(supabase, 'solicitar_acesso_empresa_por_id', {
      p_id_empresa: empresa.value.id_empresa,
    })
    sucesso(r.message)
    await recarregarVinculos()
    situacao.value = situacaoVinculo(vinculoDaEmpresa(empresa.value.id_empresa))
  } catch (e) {
    toastErro(e instanceof ErroApp ? e.message : String(e))
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <AuthCard titulo="Acesso indisponível">
    <p v-if="situacao === 'pendente'" class="text-sm text-ink-secondary">
      Sua solicitação está aguardando aprovação do administrador.
    </p>
    <p v-else-if="situacao === 'desativado'" class="text-sm text-ink-secondary">
      Seu acesso a {{ nome }} foi desativado. Fale com o administrador.
    </p>
    <p v-else class="text-sm text-ink-secondary">Você não tem acesso a {{ nome }}.</p>

    <div class="mt-5 flex flex-col gap-2">
      <AppButton v-if="situacao === 'nenhum'" :carregando="carregando" @click="solicitar">Solicitar acesso</AppButton>
      <AppButton variante="secundario" @click="navigateTo(urlDaRaiz('/empresas'), { external: true })">Minhas empresas</AppButton>
      <AppButton variante="link" class="self-center" @click="sair">Sair</AppButton>
    </div>
  </AuthCard>
</template>
