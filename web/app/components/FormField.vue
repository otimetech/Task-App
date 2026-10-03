<script setup lang="ts">
defineProps<{ rotulo: string; erro?: string | null; ajuda?: string }>()
</script>

<template>
  <label class="block">
    <span class="mb-1 block text-[13px] text-ink-muted">{{ rotulo }}</span>
    <slot />
    <span v-if="erro" class="mt-1 block text-xs text-danger-700">{{ erro }}</span>
    <span v-else-if="ajuda" class="mt-1 block text-xs text-ink-muted">{{ ajuda }}</span>
  </label>
</template>
