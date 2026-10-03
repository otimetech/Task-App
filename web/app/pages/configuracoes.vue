<script setup lang="ts">
import type { Database } from '#shared/types/database'
import { MENSAGEM_REDE } from '#shared/utils/rpc'

const supabase = useSupabaseClient<Database>()
const { empresa: tenantEmpresa } = useEmpresaAtual()

const { data: empresa, error } = await useAsyncData('config-empresa', async () => {
  const { data, error } = await supabase.from('empresas').select('*').eq('id', tenantEmpresa.value!.id_empresa).single()
  if (error) throw error
  return data
})

const aba = ref('dados')
const abas = [
  { id: 'dados', rotulo: 'Dados' },
  { id: 'identidade', rotulo: 'Identidade visual' },
  { id: 'dominio', rotulo: 'Domínio' },
]
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-xl font-semibold text-ink">Configurações</h1>
    <AppTabs v-model="aba" :abas="abas" />
    <AppCard v-if="error || !empresa">
      <p class="py-6 text-center text-sm text-danger-700">{{ MENSAGEM_REDE }}</p>
    </AppCard>
    <template v-else>
      <ConfigDados v-if="aba === 'dados'" :empresa="empresa" @salvo="empresa = $event" />
      <ConfigIdentidade v-else-if="aba === 'identidade'" :empresa="empresa" @salvo="empresa = $event" />
      <ConfigDominio v-else :id-empresa="empresa.id" />
    </template>
  </div>
</template>
