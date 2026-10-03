<script setup lang="ts">
withDefaults(
  defineProps<{
    aberto: boolean
    titulo: string
    mensagem?: string
    textoConfirmar?: string
    variante?: 'primario' | 'perigo'
    carregando?: boolean
  }>(),
  { textoConfirmar: 'Confirmar', variante: 'primario' },
)
const emit = defineEmits<{ confirmar: []; cancelar: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="aberto" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" @click.self="emit('cancelar')">
      <form
        role="dialog"
        aria-modal="true"
        class="w-full max-w-md rounded-card border border-border bg-surface p-5 shadow-card"
        @submit.prevent="emit('confirmar')"
      >
        <h2 class="text-base font-semibold text-ink">{{ titulo }}</h2>
        <p v-if="mensagem" class="mt-2 text-sm text-ink-secondary">{{ mensagem }}</p>
        <div class="mt-4 space-y-3"><slot /></div>
        <div class="mt-5 flex justify-end gap-2">
          <AppButton variante="secundario" :disabled="carregando" @click="emit('cancelar')">Cancelar</AppButton>
          <AppButton type="submit" :variante="variante" :carregando="carregando">{{ textoConfirmar }}</AppButton>
        </div>
      </form>
    </div>
  </Teleport>
</template>
