<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { itensMenu } from '#shared/utils/menu'

const route = useRoute()
const { empresa, ehAdmin, papel, nomeUsuario } = useEmpresaAtual()
const { urlDaRaiz } = useTenant()
const sair = useSair()
const menuAberto = ref(false)

const itens = computed(() => itensMenu(ehAdmin.value))
</script>

<template>
  <aside class="fixed inset-y-0 left-0 hidden w-sidebar flex-col border-r border-border bg-surface lg:flex">
    <div class="flex items-center gap-2 p-5">
      <BrandLogo :tamanho="24" />
      <span v-if="!empresa?.logo" class="truncate text-sm font-semibold text-ink">{{ empresa?.nome }}</span>
    </div>

    <nav class="flex-1 space-y-0.5 overflow-y-auto px-3">
      <template v-for="item in itens" :key="item.id">
        <NuxtLink
          v-if="item.rota"
          :to="item.rota"
          class="flex h-9 items-center gap-2 rounded-card px-3 text-[13px]"
          :class="route.path === item.rota ? 'bg-sidebar-active font-semibold text-ink' : 'text-ink-secondary hover:bg-sidebar-active'"
        >
          <MenuIcone :nome="item.icone" />
          {{ item.rotulo }}
        </NuxtLink>
        <span
          v-else
          class="flex h-9 cursor-not-allowed items-center gap-2 px-3 text-[13px] text-ink-subtle"
          title="Em breve"
        >
          <MenuIcone :nome="item.icone" />
          <span class="flex-1 truncate">{{ item.rotulo }}</span>
        </span>
      </template>
      <p class="px-3 pt-3 text-[11px] text-ink-subtle">Itens esmaecidos: em breve.</p>
    </nav>

    <div class="relative border-t border-border p-3">
      <button type="button" class="flex w-full items-center gap-2 rounded-card p-1 text-left hover:bg-sidebar-active" @click="menuAberto = !menuAberto">
        <AppAvatar :nome="nomeUsuario" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[13px] font-semibold text-ink">{{ nomeUsuario }}</span>
          <span class="block truncate text-xs text-ink-subtle">{{ papel }}</span>
        </span>
        <ChevronDown :size="16" class="text-ink-secondary" />
      </button>
      <div v-if="menuAberto" class="absolute bottom-full left-3 right-3 mb-1 rounded-card border border-border bg-surface py-1 shadow-card">
        <a :href="urlDaRaiz('/empresas')" class="block px-3 py-2 text-[13px] text-ink-secondary hover:bg-sidebar-active">Minhas empresas</a>
        <button type="button" class="block w-full px-3 py-2 text-left text-[13px] text-danger-700 hover:bg-sidebar-active" @click="sair">Sair</button>
      </div>
    </div>
  </aside>
</template>
