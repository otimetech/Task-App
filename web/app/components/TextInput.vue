<script setup lang="ts">
defineOptions({ inheritAttrs: false })
const valor = defineModel<string>({ default: '' })
</script>

<template>
  <input
    v-model="valor"
    v-bind="$attrs"
    class="h-10 w-full rounded-card border border-border bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand-600 focus:outline-none disabled:bg-sidebar-active disabled:text-ink-secondary"
  />
</template>
