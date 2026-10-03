<script setup lang="ts">
import { ChevronLeft, Search } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <div class="flex h-12 items-center justify-between gap-4">
    <button
      v-if="route.path !== '/'"
      type="button"
      class="flex items-center gap-1 text-sm text-ink"
      @click="router.back()"
    >
      <ChevronLeft :size="16" /> Voltar
    </button>
    <span v-else />
    <!-- Busca global: fora do escopo do Frontend base -->
    <label class="relative hidden w-80 md:block">
      <input
        disabled
        placeholder="Buscar equipamento, O.S., cliente…"
        class="h-9 w-full rounded-card border border-border bg-surface pl-3 pr-9 text-xs placeholder:text-ink-muted disabled:cursor-not-allowed"
      />
      <Search :size="16" class="absolute right-3 top-2.5 text-ink-muted" />
    </label>
  </div>
</template>
