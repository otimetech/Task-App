<script setup lang="ts">
const props = defineProps<{ variante: 'success' | 'danger' | 'info' | 'warning' | 'neutro'; texto: string }>()

const classes = computed(
  () =>
    ({
      success: 'bg-success-100 text-success-700',
      danger: 'bg-danger-100 text-danger-700',
      info: 'bg-brand-100 text-brand-700',
      warning: 'bg-warning-50 text-warning-600 border border-warning-200',
      neutro: 'bg-sidebar-active text-ink-secondary',
    })[props.variante],
)
</script>

<template>
  <span class="inline-block whitespace-nowrap rounded-badge px-2 py-0.5 text-[13px] font-medium" :class="classes">
    {{ texto }}
  </span>
</template>
