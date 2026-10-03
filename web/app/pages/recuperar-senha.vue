<script setup lang="ts">
import { mensagemErroAuth } from '#shared/utils/auth'

definePageMeta({ layout: 'publico' })

const supabase = useSupabaseClient()
const origem = useRequestURL().origin

const email = ref('')
const erro = ref<string | null>(null)
const enviado = ref(false)
const carregando = ref(false)

async function enviar() {
  erro.value = null
  carregando.value = true
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: `${origem}/redefinir-senha`,
    })
    if (error && /fetch|network/i.test(error.message)) {
      erro.value = mensagemErroAuth(error.message)
      return
    }
    // Mensagem neutra: não revela se o e-mail existe
    enviado.value = true
  } catch (e) {
    erro.value = mensagemErroAuth(String(e))
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <AuthCard titulo="Recuperar senha" subtitulo="Informe seu e-mail para receber o link de redefinição.">
    <p v-if="enviado" class="text-sm text-ink-secondary">Se o e-mail estiver cadastrado, você receberá um link.</p>
    <form v-else class="space-y-4" @submit.prevent="enviar">
      <FormField rotulo="E-mail">
        <TextInput v-model="email" type="email" autocomplete="email" required />
      </FormField>
      <p v-if="erro" role="alert" class="text-sm text-danger-700">{{ erro }}</p>
      <AppButton type="submit" class="w-full" :carregando="carregando">Enviar link</AppButton>
    </form>
    <NuxtLink to="/login" class="mt-4 inline-block text-[13px] text-brand-600 hover:underline">Voltar para o login</NuxtLink>
  </AuthCard>
</template>
