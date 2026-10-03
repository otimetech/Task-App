<script setup lang="ts">
defineProps<{ titulo: string; subtitulo?: string }>()
const { empresa } = useTenant()
const config = useRuntimeConfig()
</script>

<template>
  <div class="w-full max-w-[400px] rounded-card border border-border bg-surface p-6 shadow-card">
    <div class="mb-6 flex items-center gap-2">
      <BrandLogo :tamanho="28" />
      <span class="text-base font-semibold text-ink">{{ empresa?.nome ?? config.public.appName }}</span>
    </div>
    <h1 class="text-xl font-semibold text-ink">{{ titulo }}</h1>
    <p v-if="subtitulo" class="mt-1 text-sm text-ink-secondary">{{ subtitulo }}</p>
    <div class="mt-5"><slot /></div>
  </div>
</template>
