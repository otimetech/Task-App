<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { urlDaRaiz } = useTenant()

const titulo = computed(() =>
  props.error.statusCode === 404 ? props.error.statusMessage || 'Página não encontrada' : 'Algo deu errado',
)
const mensagem = computed(() =>
  props.error.statusMessage === 'Empresa não encontrada'
    ? 'Não existe empresa ativa neste endereço.'
    : props.error.statusCode === 404
      ? 'O endereço acessado não existe.'
      : props.error.statusMessage || 'Tente novamente em instantes.',
)
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-app p-4">
    <div class="w-full max-w-[400px] rounded-card border border-border bg-surface p-6 text-center shadow-card">
      <p class="text-[13px] font-medium text-ink-muted">Erro {{ error.statusCode }}</p>
      <h1 class="mt-1 text-xl font-semibold text-ink">{{ titulo }}</h1>
      <p class="mt-2 text-sm text-ink-secondary">{{ mensagem }}</p>
      <a :href="urlDaRaiz('/')" class="mt-4 inline-block text-[13px] text-brand-600 hover:underline">
        Ir para a página inicial
      </a>
    </div>
  </div>
</template>
