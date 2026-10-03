<script setup lang="ts">
import { mensagemErroAuth } from '#shared/utils/auth'
import { ErroApp } from '#shared/utils/rpc'

definePageMeta({ layout: 'publico' })

const supabase = useSupabaseClient()
const route = useRoute()
const irParaDestino = useAposLogin()

const email = ref('')
const senha = ref('')
const erro = ref<string | null>(null)
const carregando = ref(false)

async function entrar() {
  erro.value = null
  carregando.value = true
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: senha.value })
    if (error) {
      erro.value = mensagemErroAuth(error.message)
      return
    }
    await irParaDestino(route.query.redirect)
  } catch (e) {
    erro.value = e instanceof ErroApp ? e.message : mensagemErroAuth(String(e))
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <AuthCard titulo="Entrar" subtitulo="Acesse sua conta para continuar.">
    <form class="space-y-4" @submit.prevent="entrar">
      <FormField rotulo="E-mail">
        <TextInput v-model="email" type="email" autocomplete="email" required placeholder="voce@empresa.com.br" />
      </FormField>
      <FormField rotulo="Senha">
        <TextInput v-model="senha" type="password" autocomplete="current-password" required />
      </FormField>
      <p v-if="erro" role="alert" class="text-sm text-danger-700">{{ erro }}</p>
      <AppButton type="submit" class="w-full" :carregando="carregando">Entrar</AppButton>
    </form>
    <div class="mt-4 flex flex-wrap justify-between gap-2 text-[13px]">
      <NuxtLink to="/recuperar-senha" class="text-brand-600 hover:underline">Esqueci minha senha</NuxtLink>
      <NuxtLink to="/cadastro" class="text-brand-600 hover:underline">Criar conta</NuxtLink>
    </div>
  </AuthCard>
</template>
