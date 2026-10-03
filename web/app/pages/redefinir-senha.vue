<script setup lang="ts">
import { mensagemErroAuth } from '#shared/utils/auth'

definePageMeta({ layout: 'publico' })

const supabase = useSupabaseClient()
const { sucesso } = useToast()

const senha = ref('')
const confirmacao = ref('')
const erro = ref<string | null>(null)
const carregando = ref(false)

async function salvar() {
  erro.value = null
  if (senha.value.length < 8) {
    erro.value = 'A senha deve ter pelo menos 8 caracteres.'
    return
  }
  if (senha.value !== confirmacao.value) {
    erro.value = 'As senhas não conferem.'
    return
  }
  carregando.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: senha.value })
    if (error) {
      erro.value = /session/i.test(error.message)
        ? 'Link inválido ou expirado. Solicite um novo.'
        : mensagemErroAuth(error.message)
      return
    }
    await supabase.auth.signOut()
    useMinhasEmpresas().limpar()
    useSupabaseUser().value = null
    sucesso('Senha alterada. Entre com a nova senha.')
    await navigateTo('/login')
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <AuthCard titulo="Nova senha" subtitulo="Defina a nova senha da sua conta.">
    <form class="space-y-4" @submit.prevent="salvar">
      <FormField rotulo="Nova senha" ajuda="Mínimo de 8 caracteres.">
        <TextInput v-model="senha" type="password" autocomplete="new-password" required />
      </FormField>
      <FormField rotulo="Confirmar senha">
        <TextInput v-model="confirmacao" type="password" autocomplete="new-password" required />
      </FormField>
      <p v-if="erro" role="alert" class="text-sm text-danger-700">{{ erro }}</p>
      <AppButton type="submit" class="w-full" :carregando="carregando">Salvar senha</AppButton>
    </form>
  </AuthCard>
</template>
