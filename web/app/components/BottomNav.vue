<script setup lang="ts">
import { ITENS_BOTTOM_NAV, itensMenu } from '#shared/utils/menu'

const route = useRoute()
const { ehAdmin, nomeUsuario, papel, pendentes } = useEmpresaAtual()
const { urlDaRaiz } = useTenant()
const sair = useSair()
const maisAberto = ref(false)

const idsNaBarra = ITENS_BOTTOM_NAV.map((i) => i.id)
const itensMais = computed(() => itensMenu(ehAdmin.value).filter((i) => !idsNaBarra.includes(i.id)))

watch(() => route.path, () => (maisAberto.value = false))
</script>

<template>
  <div class="lg:hidden">
    <!-- Folha "Mais" -->
    <div v-if="maisAberto" class="fixed inset-0 z-30 bg-black/30" @click="maisAberto = false" />
    <div v-if="maisAberto" class="fixed inset-x-0 bottom-14 z-30 rounded-t-card border-t border-border bg-surface p-3">
      <div class="mb-2 flex items-center gap-2 border-b border-divider pb-3">
        <AppAvatar :nome="nomeUsuario" />
        <div class="min-w-0">
          <p class="truncate text-[13px] font-semibold text-ink">{{ nomeUsuario }}</p>
          <p class="text-xs text-ink-subtle">{{ papel }}</p>
        </div>
      </div>
      <template v-for="item in itensMais" :key="item.id">
        <NuxtLink v-if="item.rota" :to="item.rota" class="flex h-10 items-center gap-2 px-2 text-sm text-ink-secondary">
          <MenuIcone :nome="item.icone" /> {{ item.rotulo }}
          <span v-if="item.id === 'usuarios' && pendentes" class="ml-auto rounded-badge bg-warning-500 px-1.5 text-[11px] font-semibold text-white">{{ pendentes }}</span>
        </NuxtLink>
        <span v-else class="flex h-10 items-center gap-2 px-2 text-sm text-ink-subtle">
          <MenuIcone :nome="item.icone" /> {{ item.rotulo }}
          <span class="ml-auto text-[10px] uppercase tracking-wide">em breve</span>
        </span>
      </template>
      <a :href="urlDaRaiz('/empresas')" class="flex h-10 items-center px-2 text-sm text-ink-secondary">Minhas empresas</a>
      <button type="button" class="flex h-10 w-full items-center px-2 text-sm text-danger-700" @click="sair">Sair</button>
    </div>

    <nav class="fixed inset-x-0 bottom-0 z-30 grid h-14 grid-cols-5 border-t border-border bg-surface">
      <template v-for="item in ITENS_BOTTOM_NAV" :key="item.id">
        <button
          v-if="item.id === 'mais'"
          type="button"
          class="flex flex-col items-center justify-center gap-0.5 text-[11px]"
          :class="maisAberto ? 'text-brand-700' : 'text-ink-secondary'"
          @click="maisAberto = !maisAberto"
        >
          <span class="relative">
            <MenuIcone :nome="item.icone" />
            <span v-if="pendentes" class="absolute -right-1 -top-1 size-2 rounded-full bg-warning-500" aria-label="Solicitações pendentes" />
          </span>
          {{ item.rotulo }}
        </button>
        <NuxtLink
          v-else-if="item.rota"
          :to="item.rota"
          class="flex flex-col items-center justify-center gap-0.5 text-[11px]"
          :class="route.path === item.rota ? 'font-semibold text-brand-700' : 'text-ink-secondary'"
        >
          <MenuIcone :nome="item.icone" /> {{ item.rotulo }}
        </NuxtLink>
        <span v-else class="flex flex-col items-center justify-center gap-0.5 text-[11px] text-ink-subtle" title="Em breve">
          <MenuIcone :nome="item.icone" /> {{ item.rotulo }}
        </span>
      </template>
    </nav>
  </div>
</template>
