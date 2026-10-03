<script setup lang="ts">
defineProps<{ titulo?: string }>()
</script>

<template>
  <section class="rounded-card border border-border bg-surface shadow-card">
    <header v-if="titulo || $slots.acao" class="flex items-center justify-between gap-2 px-4 pt-4">
      <h2 class="text-base font-semibold text-ink">{{ titulo }}</h2>
      <slot name="acao" />
    </header>
    <div class="p-4">
      <slot />
    </div>
  </section>
</template>
