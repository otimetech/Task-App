<script setup lang="ts">
import { mensagemErroAuth } from '#shared/utils/auth'
import { ErroApp } from '#shared/utils/rpc'

definePageMeta({ layout: 'publico' })

const supabase = useSupabaseClient()
const route = useRoute()
const origem = useRequestURL().origin
const irParaDestino = useAposLogin()

const nome = ref('')
const email = ref('')
const senha = ref('')
const confirmacao = ref('')
const erro = ref<string | null>(null)
const enviadoPara = ref<string | null>(null)
const carregando = ref(false)

async function cadastrar() {
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
    const { data, error } = await supabase.auth.signUp({
      email: email.value.trim(),
      password: senha.value,
      // handle_new_user grava raw_user_meta_data.nome em public.users
      options: { data: { nome: nome.value.trim() }, emailRedirectTo: `${origem}/login` },
    })
    if (error) {
      erro.value = mensagemErroAuth(error.message)
      return
    }
    if (!data.session) {
      enviadoPara.value = email.value.trim()
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
  <AuthCard v-if="enviadoPara" titulo="Confirme seu e-mail">
    <p class="text-sm text-ink-secondary">Enviamos um link de confirmação para {{ enviadoPara }}.</p>
    <NuxtLink to="/login" class="mt-4 inline-block text-[13px] text-brand-600 hover:underline">Voltar para o login</NuxtLink>
  </AuthCard>
  <AuthCard v-else titulo="Criar conta" subtitulo="Use seu e-mail para acessar a plataforma.">
    <form class="space-y-4" @submit.prevent="cadastrar">
      <FormField rotulo="Nome">
        <TextInput v-model="nome" autocomplete="name" required />
      </FormField>
      <FormField rotulo="E-mail">
        <TextInput v-model="email" type="email" autocomplete="email" required />
      </FormField>
      <FormField rotulo="Senha" ajuda="Mínimo de 8 caracteres.">
        <TextInput v-model="senha" type="password" autocomplete="new-password" required />
      </FormField>
      <FormField rotulo="Confirmar senha">
        <TextInput v-model="confirmacao" type="password" autocomplete="new-password" required />
      </FormField>
      <p v-if="erro" role="alert" class="text-sm text-danger-700">{{ erro }}</p>
      <AppButton type="submit" class="w-full" :carregando="carregando">Criar conta</AppButton>
    </form>
    <p class="mt-4 text-[13px] text-ink-secondary">
      Já tem conta?
      <NuxtLink to="/login" class="text-brand-600 hover:underline">Entrar</NuxtLink>
    </p>
  </AuthCard>
</template>
