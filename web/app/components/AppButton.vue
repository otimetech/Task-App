<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    variante?: 'primario' | 'secundario' | 'perigo' | 'link'
    carregando?: boolean
    type?: 'button' | 'submit'
    disabled?: boolean
  }>(),
  { variante: 'primario', type: 'button' },
)

// Antes da hidratação, um submit faria envio nativo do formulário (recarrega e perde os dados)
const montado = ref(false)
onMounted(() => (montado.value = true))

const classes = computed(
  () =>
    ({
      primario: 'bg-brand-700 text-white hover:bg-brand-900 px-4 h-10',
      secundario: 'bg-surface text-ink border border-border hover:bg-sidebar-active px-4 h-10',
      perigo: 'bg-danger-700 text-white hover:bg-danger-600 px-4 h-10',
      link: 'text-brand-600 hover:underline h-auto px-0',
    })[props.variante],
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || carregando || (type === 'submit' && !montado)"
    class="inline-flex items-center justify-center gap-2 rounded-card text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
    :class="classes"
  >
    <LoaderCircle v-if="carregando" class="size-4 animate-spin" />
    <slot />
  </button>
</template>
