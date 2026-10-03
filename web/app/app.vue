<script setup lang="ts">
import { estiloTema, gerarVariaveisTema } from '#shared/utils/tema'

const { tenant, empresa, cores } = useTenant()
const config = useRuntimeConfig()

useHead(() => ({
  htmlAttrs: { style: estiloTema(gerarVariaveisTema(cores.value)) },
  title: empresa.value?.nome ?? config.public.appName,
}))

if (tenant.value.contexto === 'desconhecido') {
  showError({ statusCode: 404, statusMessage: 'Empresa não encontrada' })
}
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AppToast />
</template>
