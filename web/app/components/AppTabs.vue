<script setup lang="ts">
defineProps<{ abas: { id: string; rotulo: string; contador?: number }[] }>()
const ativa = defineModel<string>({ required: true })
</script>

<template>
  <nav class="flex gap-6 overflow-x-auto border-b border-divider">
    <button
      v-for="aba in abas"
      :key="aba.id"
      type="button"
      class="-mb-px whitespace-nowrap border-b-2 pb-2 text-sm"
      :class="ativa === aba.id ? 'border-ink font-medium text-ink' : 'border-transparent text-ink-muted hover:text-ink-secondary'"
      @click="ativa = aba.id"
    >
      {{ aba.rotulo }}
      <span v-if="aba.contador" class="ml-1 rounded-badge bg-brand-100 px-1.5 text-xs text-brand-700">{{ aba.contador }}</span>
    </button>
  </nav>
</template>
