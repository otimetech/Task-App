<script setup lang="ts">
import type { UsuarioEmpresa } from '#shared/types/app'
import { ROTULO_PAPEL } from '#shared/utils/menu'

const { empresa, ehAdmin } = useEmpresaAtual()
const gestao = useUsuariosEmpresa(empresa.value!.id_empresa)
const { usuarios, carregando, erroCarga } = gestao
await gestao.carregar()

const aba = ref('ativos')
const grupos = computed(() => ({
  ativos: usuarios.value.filter((u) => u.aprovado && u.ativo),
  pendentes: usuarios.value.filter((u) => !u.aprovado),
  desativados: usuarios.value.filter((u) => u.aprovado && !u.ativo),
}))
const abas = computed(() => [
  { id: 'ativos', rotulo: 'Ativos' },
  { id: 'pendentes', rotulo: 'Pendentes', contador: grupos.value.pendentes.length },
  { id: 'desativados', rotulo: 'Desativados' },
])
const lista = computed(() => grupos.value[aba.value as keyof typeof grupos.value])

const OPCOES_PAPEL = [
  { valor: 'tecnico', rotulo: 'Técnico' },
  { valor: 'supervisor', rotulo: 'Supervisor' },
  { valor: 'administrador', rotulo: 'Administrador' },
]

type Acao = 'aprovar' | 'rejeitar' | 'papel' | 'desativar' | 'reativar'
const dialogo = reactive({ acao: null as Acao | null, usuario: null as UsuarioEmpresa | null, papel: 'tecnico', matricula: '', enviando: false })

const TEXTOS: Record<Acao, { titulo: string; confirmar: string; perigo?: boolean; mensagem?: (u: UsuarioEmpresa) => string }> = {
  aprovar: { titulo: 'Aprovar usuário', confirmar: 'Aprovar' },
  rejeitar: { titulo: 'Rejeitar solicitação', confirmar: 'Rejeitar', perigo: true, mensagem: (u) => `A solicitação de ${u.nome || u.email} será excluída.` },
  papel: { titulo: 'Alterar papel', confirmar: 'Salvar' },
  desativar: { titulo: 'Desativar usuário', confirmar: 'Desativar', perigo: true, mensagem: (u) => `${u.nome || u.email} perde o acesso à empresa.` },
  reativar: { titulo: 'Reativar usuário', confirmar: 'Reativar', mensagem: (u) => `${u.nome || u.email} volta a ter acesso à empresa.` },
}

function abrir(acao: Acao, u: UsuarioEmpresa) {
  Object.assign(dialogo, { acao, usuario: u, papel: u.tipo_acesso, matricula: u.matricula ?? '', enviando: false })
}

async function confirmar() {
  const u = dialogo.usuario!
  dialogo.enviando = true
  const executado = await {
    aprovar: () => gestao.aprovar(u.id_usuario, dialogo.papel, dialogo.matricula.trim()),
    rejeitar: () => gestao.rejeitar(u.id_usuario),
    papel: () => gestao.alterarPapel(u.id_usuario, dialogo.papel),
    desativar: () => gestao.desativar(u.id_usuario),
    reativar: () => gestao.reativar(u.id_usuario),
  }[dialogo.acao!]()
  dialogo.enviando = false
  if (executado) dialogo.acao = null
  // O admin pode ter tirado o próprio acesso de administrador
  if (!ehAdmin.value) await navigateTo('/')
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-xl font-semibold text-ink">Usuários</h1>
    <AppTabs v-model="aba" :abas="abas" />

    <AppCard>
      <p v-if="erroCarga" class="py-6 text-center text-sm text-danger-700">
        {{ erroCarga }}
        <AppButton variante="link" class="ml-2" @click="gestao.carregar()">Tentar de novo</AppButton>
      </p>
      <EmptyState v-else-if="!lista.length && !carregando" titulo="Nenhum usuário nesta lista." />
      <ul v-else class="divide-y divide-divider">
        <li v-for="u in lista" :key="u.id_usuario" class="flex flex-wrap items-center gap-3 py-3">
          <AppAvatar :nome="u.nome || u.email" :foto="u.foto" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-ink">{{ u.nome || '—' }}</p>
            <p class="truncate text-xs text-ink-muted">
              {{ u.email }}<span v-if="u.matricula"> · Matrícula {{ u.matricula }}</span>
            </p>
          </div>
          <StatusBadge v-if="u.aprovado" variante="info" :texto="ROTULO_PAPEL[u.tipo_acesso] ?? u.tipo_acesso" />
          <div class="flex gap-2">
            <template v-if="aba === 'pendentes'">
              <AppButton variante="secundario" @click="abrir('rejeitar', u)">Rejeitar</AppButton>
              <AppButton @click="abrir('aprovar', u)">Aprovar</AppButton>
            </template>
            <template v-else-if="aba === 'ativos'">
              <AppButton variante="secundario" @click="abrir('papel', u)">Alterar papel</AppButton>
              <AppButton variante="secundario" @click="abrir('desativar', u)">Desativar</AppButton>
            </template>
            <AppButton v-else variante="secundario" @click="abrir('reativar', u)">Reativar</AppButton>
          </div>
        </li>
      </ul>
    </AppCard>

    <ConfirmDialog
      v-if="dialogo.acao && dialogo.usuario"
      :aberto="true"
      :titulo="TEXTOS[dialogo.acao].titulo"
      :mensagem="TEXTOS[dialogo.acao].mensagem?.(dialogo.usuario)"
      :texto-confirmar="TEXTOS[dialogo.acao].confirmar"
      :variante="TEXTOS[dialogo.acao].perigo ? 'perigo' : 'primario'"
      :carregando="dialogo.enviando"
      @cancelar="dialogo.acao = null"
      @confirmar="confirmar"
    >
      <template v-if="dialogo.acao === 'aprovar' || dialogo.acao === 'papel'">
        <p class="text-sm text-ink-secondary">{{ dialogo.usuario.nome || dialogo.usuario.email }}</p>
        <FormField rotulo="Papel">
          <SelectInput v-model="dialogo.papel" :opcoes="OPCOES_PAPEL" />
        </FormField>
        <FormField v-if="dialogo.acao === 'aprovar'" rotulo="Matrícula">
          <TextInput v-model="dialogo.matricula" required />
        </FormField>
      </template>
    </ConfirmDialog>
  </div>
</template>
