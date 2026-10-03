<script setup lang="ts">
defineProps<{ rotulo: string; erro?: string | null; ajuda?: string }>()
</script>

<template>
  <div>
    <!-- Ajuda e erro ficam fora do <label> para não entrarem no nome acessível do campo -->
    <label class="block">
      <span class="mb-1 block text-[13px] text-ink-muted">{{ rotulo }}</span>
      <slot />
    </label>
    <slot name="extra" />
    <span v-if="erro" class="mt-1 block text-xs text-danger-700">{{ erro }}</span>
    <span v-else-if="ajuda" class="mt-1 block text-xs text-ink-muted">{{ ajuda }}</span>
  </div>
</template>
