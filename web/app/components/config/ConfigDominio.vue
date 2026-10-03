<script setup lang="ts">
import { ErroApp, rpc } from '#shared/utils/rpc'
import { normalizarSubdominio, validarSubdominio } from '#shared/utils/subdominio'

const props = defineProps<{ idEmpresa: number }>()

const supabase = useSupabaseClient()
const config = useRuntimeConfig()
const { empresa, urlDaEmpresa } = useTenant()
const { erro: toastErro } = useToast()

const novo = ref('')
const erroCampo = ref<string | null>(null)
const confirmando = ref(false)
const enviando = ref(false)

watch(novo, (v) => {
  const n = normalizarSubdominio(v)
  if (n !== v) novo.value = n
  erroCampo.value = null
})

function pedirConfirmacao() {
  erroCampo.value = validarSubdominio(novo.value)
  if (!erroCampo.value) confirmando.value = true
}

async function alterar() {
  enviando.value = true
  try {
    const r = await rpc<{ subdominio: string }>(supabase, 'alterar_subdominio', {
      p_id_empresa: props.idEmpresa,
      p_subdominio: novo.value,
    })
    await navigateTo(urlDaEmpresa(r.subdominio, '/configuracoes'), { external: true })
  } catch (e) {
    toastErro(e instanceof ErroApp ? e.message : String(e))
    confirmando.value = false
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <AppCard titulo="Domínio">
    <KeyValueRow rotulo="Endereço atual" :valor="`${empresa?.subdominio}.${config.public.baseDomain}`" />
    <form class="mt-4 space-y-3" @submit.prevent="pedirConfirmacao">
      <FormField rotulo="Novo subdomínio" :erro="erroCampo">
        <TextInput v-model="novo" required placeholder="minha-empresa" />
        <template #extra>
          <span class="mt-1 block text-xs text-ink-muted">{{ novo || 'minha-empresa' }}.{{ config.public.baseDomain }}</span>
        </template>
      </FormField>
      <AppButton type="submit" variante="secundario">Alterar subdomínio</AppButton>
    </form>
    <ConfirmDialog
      :aberto="confirmando"
      titulo="Alterar subdomínio"
      :mensagem="`O endereço passará a ser ${novo}.${config.public.baseDomain}. Links antigos deixam de funcionar.`"
      texto-confirmar="Alterar"
      variante="perigo"
      :carregando="enviando"
      @cancelar="confirmando = false"
      @confirmar="alterar"
    />
  </AppCard>
</template>
