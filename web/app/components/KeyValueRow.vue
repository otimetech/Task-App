<script setup lang="ts">
defineProps<{ rotulo: string; valor?: string | null }>()
</script>

<template>
  <div class="flex gap-4 border-b border-divider py-2 last:border-b-0">
    <span class="w-[45%] shrink-0 text-[13px] text-ink-muted">{{ rotulo }}</span>
    <span class="text-sm text-ink">
      <slot>{{ valor || '—' }}</slot>
    </span>
  </div>
</template>
