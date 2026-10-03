<script setup lang="ts">
defineProps<{ titulo: string; mensagem?: string }>()
</script>

<template>
  <div class="flex flex-col items-center px-4 py-10 text-center">
    <p class="text-base font-semibold text-ink">{{ titulo }}</p>
    <p v-if="mensagem" class="mt-1 max-w-sm text-sm text-ink-secondary">{{ mensagem }}</p>
    <div v-if="$slots.acoes" class="mt-4 flex flex-wrap justify-center gap-2"><slot name="acoes" /></div>
  </div>
</template>
