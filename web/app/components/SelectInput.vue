<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ opcoes: { valor: string; rotulo: string }[] }>()
const valor = defineModel<string>({ default: '' })
</script>

<template>
  <select
    v-model="valor"
    v-bind="$attrs"
    class="h-10 w-full rounded-card border border-border bg-surface px-3 text-sm text-ink focus:border-brand-600 focus:outline-none"
  >
    <option v-for="o in opcoes" :key="o.valor" :value="o.valor">{{ o.rotulo }}</option>
  </select>
</template>
