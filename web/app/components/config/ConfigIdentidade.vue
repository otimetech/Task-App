<script setup lang="ts">
import type { Database } from '#shared/types/database'
import { MENSAGEM_REDE } from '#shared/utils/rpc'

type Empresa = Database['public']['Tables']['empresas']['Row']

const props = defineProps<{ empresa: Empresa }>()
const emit = defineEmits<{ salvo: [Empresa] }>()

const supabase = useSupabaseClient<Database>()
const { urlLogo, aplicarCores, atualizarEmpresa } = useTenant()
const { sucesso, erro } = useToast()

const PADRAO = { primaria: '#004E61', secundaria: '#266478' }
const TIPOS = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
const EXTENSAO: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp' }
const HEX = /^#[0-9A-Fa-f]{6}$/

const logoAtual = ref(props.empresa.logo)
const primaria = ref(props.empresa.cor_primaria ?? '')
const secundaria = ref(props.empresa.cor_secundaria ?? '')
const enviandoLogo = ref(false)
const salvandoCores = ref(false)

// Prévia ao vivo: só aplica cores válidas
watch([primaria, secundaria], ([p, s]) => {
  aplicarCores({ cor_primaria: HEX.test(p) ? p : null, cor_secundaria: HEX.test(s) ? s : null })
})

// Saiu da página sem salvar: volta às cores salvas
onBeforeUnmount(() => {
  aplicarCores({ cor_primaria: props.empresa.cor_primaria, cor_secundaria: props.empresa.cor_secundaria })
})

async function gravarLogo(caminho: string | null) {
  const { data, error } = await supabase.from('empresas').update({ logo: caminho }).eq('id', props.empresa.id).select().single()
  if (error) throw error
  logoAtual.value = caminho
  atualizarEmpresa({ logo: caminho })
  emit('salvo', data)
}

async function enviarLogo(evento: Event) {
  const input = evento.target as HTMLInputElement
  const arquivo = input.files?.[0]
  input.value = ''
  if (!arquivo) return
  if (!TIPOS.includes(arquivo.type)) return erro('Use uma imagem PNG, JPG, SVG ou WEBP.')
  if (arquivo.size > 1024 * 1024) return erro('A logo deve ter no máximo 1 MB.')

  enviandoLogo.value = true
  // Nome único evita cache de CDN/navegador da logo anterior
  const caminho = `${props.empresa.id}/logo-${Date.now()}.${EXTENSAO[arquivo.type]}`
  const anterior = logoAtual.value
  try {
    const { error } = await supabase.storage.from('logos').upload(caminho, arquivo, { contentType: arquivo.type })
    if (error) throw error
    await gravarLogo(caminho)
    if (anterior) await supabase.storage.from('logos').remove([anterior])
    sucesso('Logo atualizada.')
  } catch (e) {
    erro(/fetch|network/i.test(String((e as Error)?.message)) ? MENSAGEM_REDE : 'Não foi possível enviar a logo.')
  } finally {
    enviandoLogo.value = false
  }
}

async function removerLogo() {
  const anterior = logoAtual.value
  if (!anterior) return
  enviandoLogo.value = true
  try {
    await gravarLogo(null)
    await supabase.storage.from('logos').remove([anterior])
    sucesso('Logo removida.')
  } catch {
    erro('Não foi possível remover a logo.')
  } finally {
    enviandoLogo.value = false
  }
}

async function salvarCores(restaurar = false) {
  if (restaurar) {
    primaria.value = ''
    secundaria.value = ''
  }
  for (const [rotulo, valor] of [['principal', primaria.value], ['secundária', secundaria.value]]) {
    if (valor && !HEX.test(valor)) return erro(`Cor ${rotulo} inválida. Use o formato #RRGGBB.`)
  }
  salvandoCores.value = true
  const cores = { cor_primaria: primaria.value || null, cor_secundaria: secundaria.value || null }
  const { data, error } = await supabase.from('empresas').update(cores).eq('id', props.empresa.id).select().single()
  salvandoCores.value = false
  if (error) return erro('Não foi possível salvar as cores.')
  atualizarEmpresa(cores)
  aplicarCores(cores)
  emit('salvo', data)
  sucesso(restaurar ? 'Cores padrão restauradas.' : 'Cores salvas.')
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <AppCard titulo="Logo">
      <div class="flex items-center gap-4">
        <div class="flex h-20 w-40 items-center justify-center rounded-card border border-border bg-app">
          <img v-if="urlLogo" :src="urlLogo" alt="Logo" class="max-h-16 max-w-36 object-contain" />
          <BrandLogo v-else :tamanho="32" />
        </div>
        <div class="flex flex-col gap-2">
          <label class="inline-flex">
            <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp" class="hidden" :disabled="enviandoLogo" @change="enviarLogo" />
            <span class="inline-flex h-10 cursor-pointer items-center rounded-card bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-900">
              {{ enviandoLogo ? 'Enviando…' : 'Enviar logo' }}
            </span>
          </label>
          <AppButton v-if="logoAtual" variante="link" :disabled="enviandoLogo" @click="removerLogo">Remover logo</AppButton>
        </div>
      </div>
      <p class="mt-3 text-xs text-ink-muted">PNG, JPG, SVG ou WEBP, até 1 MB.</p>
    </AppCard>

    <AppCard titulo="Cores">
      <div class="space-y-4">
        <FormField rotulo="Cor principal" ajuda="Botões, destaques e menu. Vazio = padrão.">
          <div class="flex gap-2">
            <input type="color" class="h-10 w-12 cursor-pointer rounded-card border border-border" :value="primaria || PADRAO.primaria" @input="primaria = ($event.target as HTMLInputElement).value.toUpperCase()" />
            <TextInput v-model="primaria" placeholder="#004E61" />
          </div>
        </FormField>
        <FormField rotulo="Cor secundária" ajuda="Links e ações secundárias. Vazio = derivada da principal.">
          <div class="flex gap-2">
            <input type="color" class="h-10 w-12 cursor-pointer rounded-card border border-border" :value="secundaria || PADRAO.secundaria" @input="secundaria = ($event.target as HTMLInputElement).value.toUpperCase()" />
            <TextInput v-model="secundaria" placeholder="#266478" />
          </div>
        </FormField>
        <div class="flex flex-wrap items-center gap-3 rounded-card border border-brand-50-border bg-brand-50 p-3">
          <span class="text-xs text-ink-muted">Prévia:</span>
          <AppButton>Botão</AppButton>
          <StatusBadge variante="info" texto="Em andamento" />
          <AppButton variante="link">Ver todos</AppButton>
        </div>
        <div class="flex gap-2">
          <AppButton :carregando="salvandoCores" @click="salvarCores()">Salvar cores</AppButton>
          <AppButton variante="secundario" :disabled="salvandoCores" @click="salvarCores(true)">Restaurar padrão</AppButton>
        </div>
      </div>
    </AppCard>
  </div>
</template>
