<script setup lang="ts">
import { ITENS_MENU } from '#shared/utils/menu'

const { empresa, papel, nomeUsuario } = useEmpresaAtual()
const emBreve = ITENS_MENU.filter((i) => i.rota === null)
</script>

<template>
  <div class="space-y-4">
    <AppCard>
      <p class="text-[13px] font-medium text-ink-muted">{{ empresa?.nome }}</p>
      <h1 class="mt-1 text-[28px] font-bold leading-tight text-ink">Olá, {{ nomeUsuario.split(' ')[0] }}</h1>
      <p class="mt-1 text-sm text-ink-secondary">Você está como <strong class="font-semibold">{{ papel }}</strong>.</p>
    </AppCard>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AppCard v-for="item in emBreve" :key="item.id">
        <div class="flex items-center gap-3">
          <span class="flex size-10 items-center justify-center rounded-card bg-brand-50 text-brand-700">
            <MenuIcone :nome="item.icone" />
          </span>
          <div class="flex-1">
            <p class="text-sm font-semibold text-ink">{{ item.rotulo }}</p>
            <p class="text-xs text-ink-muted">Em breve</p>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>
