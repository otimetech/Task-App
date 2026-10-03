<script setup lang="ts">
import type { Database } from '#shared/types/database'
import { mascararCnpj } from '#shared/utils/cnpj'
import { MENSAGEM_REDE } from '#shared/utils/rpc'

type Empresa = Database['public']['Tables']['empresas']['Row']

const props = defineProps<{ empresa: Empresa }>()
const emit = defineEmits<{ salvo: [Empresa] }>()

const supabase = useSupabaseClient<Database>()
const { atualizarEmpresa } = useTenant()
const { sucesso, erro } = useToast()

const CAMPOS = [
  ['razao_social', 'Razão social'],
  ['nome_fantasia', 'Nome fantasia'],
  ['email', 'E-mail'],
  ['telefone', 'Telefone'],
  ['site', 'Site'],
  ['responsavel', 'Responsável'],
  ['endereco', 'Endereço'],
  ['numero', 'Número'],
  ['complemento', 'Complemento'],
  ['bairro', 'Bairro'],
  ['cidade', 'Cidade'],
  ['estado', 'Estado'],
  ['cep', 'CEP'],
] as const
type Campo = (typeof CAMPOS)[number][0]

const form = reactive(Object.fromEntries(CAMPOS.map(([c]) => [c, props.empresa[c] ?? ''])) as Record<Campo, string>)
const salvando = ref(false)

async function salvar() {
  if (!form.razao_social.trim()) {
    erro('Razão social é obrigatória.')
    return
  }
  salvando.value = true
  const dados = Object.fromEntries(CAMPOS.map(([c]) => [c, form[c].trim() || null])) as Record<Campo, string | null>
  dados.razao_social = form.razao_social.trim()
  const { data, error } = await supabase
    .from('empresas')
    .update(dados as Database['public']['Tables']['empresas']['Update'])
    .eq('id', props.empresa.id)
    .select()
    .single()
  salvando.value = false
  if (error) {
    erro(/fetch|network/i.test(error.message) ? MENSAGEM_REDE : 'Não foi possível salvar os dados.')
    return
  }
  atualizarEmpresa({ nome: data.nome_fantasia || data.razao_social })
  emit('salvo', data)
  sucesso('Dados salvos.')
}
</script>

<template>
  <AppCard titulo="Dados da empresa">
    <form class="grid grid-cols-1 gap-4 md:grid-cols-2" @submit.prevent="salvar">
      <FormField rotulo="CNPJ" ajuda="O CNPJ não pode ser alterado.">
        <TextInput :model-value="mascararCnpj(empresa.cnpj)" disabled />
      </FormField>
      <FormField v-for="[campo, rotulo] in CAMPOS" :key="campo" :rotulo="rotulo">
        <TextInput v-model="form[campo]" :required="campo === 'razao_social'" />
      </FormField>
      <div class="md:col-span-2">
        <AppButton type="submit" :carregando="salvando">Salvar dados</AppButton>
      </div>
    </form>
  </AppCard>
</template>
