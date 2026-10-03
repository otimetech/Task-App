<script setup lang="ts">
import { cnpjValido, mascararCnpj } from '#shared/utils/cnpj'
import { ErroApp, rpc } from '#shared/utils/rpc'

definePageMeta({ layout: 'publico' })

const supabase = useSupabaseClient()
const { recarregarVinculos } = useMinhasEmpresas()
const { sucesso, erro: toastErro } = useToast()

const cnpj = ref('')
const erroCnpj = ref<string | null>(null)
const carregando = ref(false)

watch(cnpj, (v) => {
  const m = mascararCnpj(v)
  if (m !== v) cnpj.value = m
  erroCnpj.value = null
})

async function solicitar() {
  if (!cnpjValido(cnpj.value)) {
    erroCnpj.value = 'CNPJ inválido.'
    return
  }
  carregando.value = true
  try {
    const r = await rpc<{ message: string }>(supabase, 'solicitar_acesso_empresa', { p_cnpj: cnpj.value })
    sucesso(r.message)
    await recarregarVinculos()
    await navigateTo('/empresas')
  } catch (e) {
    toastErro(e instanceof ErroApp ? e.message : String(e))
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <AuthCard titulo="Entrar em uma empresa" subtitulo="Informe o CNPJ. O administrador precisa aprovar sua solicitação.">
    <form class="space-y-4" @submit.prevent="solicitar">
      <FormField rotulo="CNPJ da empresa" :erro="erroCnpj">
        <TextInput v-model="cnpj" required placeholder="00.000.000/0000-00" />
      </FormField>
      <div class="flex gap-2">
        <AppButton variante="secundario" @click="navigateTo('/empresas')">Voltar</AppButton>
        <AppButton type="submit" class="flex-1" :carregando="carregando">Solicitar acesso</AppButton>
      </div>
    </form>
  </AuthCard>
</template>
