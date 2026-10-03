<script setup lang="ts">
withDefaults(defineProps<{ tamanho?: number }>(), { tamanho: 24 })
const { urlLogo, empresa } = useTenant()
</script>

<template>
  <img
    v-if="urlLogo"
    :src="urlLogo"
    :alt="empresa?.nome ?? 'Logo'"
    class="object-contain"
    :style="{ height: `${tamanho}px`, maxWidth: `${tamanho * 4}px` }"
  />
  <!-- Hexágono padrão do modelo (design.md 5.1) -->
  <svg
    v-else
    :width="tamanho"
    :height="tamanho"
    viewBox="0 0 24 24"
    fill="none"
    class="text-brand-900"
    aria-label="ManutGO"
  >
    <path d="M12 2.5 20.5 7.25v9.5L12 21.5l-8.5-4.75v-9.5L12 2.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
  </svg>
</template>
