<script setup lang="ts">
import { cnpjValido, mascararCnpj } from '#shared/utils/cnpj'
import { ErroApp, rpc } from '#shared/utils/rpc'
import { normalizarSubdominio, validarSubdominio } from '#shared/utils/subdominio'

definePageMeta({ layout: 'publico' })

const supabase = useSupabaseClient()
const config = useRuntimeConfig()
const { urlDaEmpresa } = useTenant()
const { recarregarVinculos } = useMinhasEmpresas()
const { erro: toastErro } = useToast()

const form = reactive({ razao: '', fantasia: '', cnpj: '', matricula: '', subdominio: '' })
const erroCnpj = ref<string | null>(null)
const statusSub = ref<{ ok: boolean; mensagem: string } | null>(null)
const carregando = ref(false)

watch(
  () => form.cnpj,
  (v) => {
    const m = mascararCnpj(v)
    if (m !== v) form.cnpj = m
    erroCnpj.value = null
  },
)

let timer: ReturnType<typeof setTimeout> | undefined
let consulta = 0
watch(
  () => form.subdominio,
  (v) => {
    const n = normalizarSubdominio(v)
    if (n !== v) {
      form.subdominio = n
      return
    }
    clearTimeout(timer)
    const erroLocal = validarSubdominio(n)
    if (erroLocal) {
      statusSub.value = n ? { ok: false, mensagem: erroLocal } : null
      return
    }
    statusSub.value = null
    const id = ++consulta
    timer = setTimeout(async () => {
      try {
        const r = await rpc<{ disponivel: boolean; message: string }>(supabase, 'verificar_subdominio', { p_subdominio: n })
        if (id === consulta) statusSub.value = { ok: r.disponivel, mensagem: r.message }
      } catch (e) {
        if (id === consulta) statusSub.value = { ok: false, mensagem: e instanceof ErroApp ? e.message : String(e) }
      }
    }, 400)
  },
)

async function criar() {
  if (!cnpjValido(form.cnpj)) {
    erroCnpj.value = 'CNPJ inválido.'
    return
  }
  const erroSub = validarSubdominio(form.subdominio)
  if (erroSub) {
    statusSub.value = { ok: false, mensagem: erroSub }
    return
  }
  carregando.value = true
  try {
    const r = await rpc<{ subdominio: string }>(supabase, 'criar_empresa', {
      p_razao_social: form.razao,
      p_nome_fantasia: form.fantasia,
      p_cnpj: form.cnpj,
      p_matricula: form.matricula,
      p_subdominio: form.subdominio,
    })
    await recarregarVinculos()
    await navigateTo(urlDaEmpresa(r.subdominio), { external: true })
  } catch (e) {
    toastErro(e instanceof ErroApp ? e.message : String(e))
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <AuthCard titulo="Criar empresa" subtitulo="Você será o administrador da nova empresa.">
    <form class="space-y-4" @submit.prevent="criar">
      <FormField rotulo="Razão social">
        <TextInput v-model="form.razao" required />
      </FormField>
      <FormField rotulo="Nome fantasia">
        <TextInput v-model="form.fantasia" />
      </FormField>
      <FormField rotulo="CNPJ" :erro="erroCnpj">
        <TextInput v-model="form.cnpj" required placeholder="00.000.000/0000-00" />
      </FormField>
      <FormField rotulo="Sua matrícula" ajuda="Identificação interna nas O.S. e relatórios.">
        <TextInput v-model="form.matricula" required />
      </FormField>
      <FormField rotulo="Subdomínio" :erro="statusSub && !statusSub.ok ? statusSub.mensagem : null">
        <TextInput v-model="form.subdominio" required placeholder="minha-empresa" />
        <template #extra>
        <span class="mt-1 block text-xs text-ink-muted">
          {{ form.subdominio || 'minha-empresa' }}.{{ config.public.baseDomain }}
          <span v-if="statusSub?.ok" class="ml-1 font-medium text-success-700">· Disponível</span>
        </span>
        </template>
      </FormField>
      <div class="flex gap-2">
        <AppButton variante="secundario" @click="navigateTo('/empresas')">Voltar</AppButton>
        <AppButton type="submit" class="flex-1" :carregando="carregando">Criar empresa</AppButton>
      </div>
    </form>
  </AuthCard>
</template>
