<script setup lang="ts">
const props = withDefaults(defineProps<{ nome: string; foto?: string | null; tamanho?: number }>(), { tamanho: 32 })

const iniciais = computed(() =>
  (props.nome || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join(''),
)
</script>

<template>
  <img
    v-if="foto"
    :src="foto"
    :alt="nome"
    class="shrink-0 rounded-full object-cover"
    :style="{ width: `${tamanho}px`, height: `${tamanho}px` }"
  />
  <span
    v-else
    class="inline-flex shrink-0 items-center justify-center rounded-full bg-avatar text-xs font-semibold text-ink"
    :style="{ width: `${tamanho}px`, height: `${tamanho}px` }"
  >
    {{ iniciais }}
  </span>
</template>
