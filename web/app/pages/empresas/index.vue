<script setup lang="ts">
import type { Vinculo } from '#shared/types/app'
import { situacaoVinculo } from '#shared/utils/acesso'
import { ErroApp, MENSAGEM_REDE } from '#shared/utils/rpc'

definePageMeta({ layout: 'publico' })

const config = useRuntimeConfig()
const { urlDaEmpresa } = useTenant()
const { recarregarVinculos } = useMinhasEmpresas()
const sair = useSair()
const user = useSupabaseUser()

const { data: vinculos, error, refresh } = await useAsyncData('minhas-empresas', () => recarregarVinculos())

const badge = {
  ativo: { variante: 'success', texto: 'Ativo' },
  pendente: { variante: 'warning', texto: 'Aguardando aprovação' },
  desativado: { variante: 'danger', texto: 'Desativado' },
  nenhum: { variante: 'neutro', texto: '' },
} as const

function logoDe(v: Vinculo) {
  return v.logo ? `${config.public.supabase.url}/storage/v1/object/public/logos/${v.logo}` : null
}
</script>

<template>
  <div class="w-full max-w-2xl">
    <header class="mb-6 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <BrandLogo :tamanho="28" />
        <span class="text-base font-semibold text-ink">{{ config.public.appName }}</span>
      </div>
      <div class="flex items-center gap-3 text-[13px] text-ink-secondary">
        <span class="hidden sm:inline">{{ user?.email }}</span>
        <AppButton variante="link" @click="sair">Sair</AppButton>
      </div>
    </header>

    <AppCard titulo="Minhas empresas">
      <template #acao>
        <div class="flex gap-2">
          <AppButton variante="secundario" @click="navigateTo('/empresas/solicitar')">Entrar em uma empresa</AppButton>
          <AppButton @click="navigateTo('/empresas/nova')">Criar empresa</AppButton>
        </div>
      </template>

      <div v-if="error" class="py-6 text-center text-sm text-danger-700">
        {{ error instanceof ErroApp ? error.message : MENSAGEM_REDE }}
        <AppButton variante="link" class="ml-2" @click="refresh()">Tentar de novo</AppButton>
      </div>

      <EmptyState
        v-else-if="!vinculos?.length"
        titulo="Você ainda não participa de nenhuma empresa."
        mensagem="Crie a sua empresa ou peça acesso a uma empresa existente pelo CNPJ."
      />

      <ul v-else class="divide-y divide-divider">
        <li v-for="v in vinculos" :key="v.id_empresa" class="flex items-center gap-3 py-3">
          <img v-if="logoDe(v)" :src="logoDe(v)!" :alt="v.nome" class="size-10 rounded-card object-contain" />
          <AppAvatar v-else :nome="v.nome" :tamanho="40" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-ink">{{ v.nome }}</p>
            <p class="truncate text-xs text-ink-muted">{{ v.subdominio }}.{{ config.public.baseDomain }}</p>
          </div>
          <StatusBadge v-bind="badge[situacaoVinculo(v)]" />
          <AppButton
            v-if="situacaoVinculo(v) === 'ativo' && v.subdominio"
            variante="secundario"
            @click="navigateTo(urlDaEmpresa(v.subdominio), { external: true })"
          >
            Entrar
          </AppButton>
        </li>
      </ul>
    </AppCard>
  </div>
</template>
