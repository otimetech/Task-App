<script setup lang="ts">
import { CircleCheck, CircleAlert, X } from 'lucide-vue-next'

const { toasts, fechar } = useToast()
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
    <div
      v-for="t in toasts"
      :key="t.id"
      role="status"
      class="pointer-events-auto flex items-start gap-2 rounded-card border p-3 text-sm shadow-card"
      :class="t.tipo === 'sucesso' ? 'border-success-100 bg-success-100 text-success-700' : 'border-danger-100 bg-danger-100 text-danger-700'"
    >
      <CircleCheck v-if="t.tipo === 'sucesso'" class="mt-0.5 size-4 shrink-0" />
      <CircleAlert v-else class="mt-0.5 size-4 shrink-0" />
      <span class="flex-1">{{ t.mensagem }}</span>
      <button type="button" aria-label="Fechar" @click="fechar(t.id)"><X class="size-4" /></button>
    </div>
  </div>
</template>
