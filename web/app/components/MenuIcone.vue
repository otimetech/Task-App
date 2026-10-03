<script setup lang="ts">
import {
  Building2,
  CalendarCheck,
  ClipboardList,
  Factory,
  FileText,
  LayoutGrid,
  ListChecks,
  Menu,
  Monitor,
  Settings,
  Tags,
  Users,
} from 'lucide-vue-next'

const props = defineProps<{ nome: string }>()
const icones: Record<string, unknown> = {
  Building2, CalendarCheck, ClipboardList, Factory, FileText, LayoutGrid, ListChecks, Menu, Monitor, Settings, Tags, Users,
}
const componente = computed(() => icones[props.nome] ?? LayoutGrid)
</script>

<template>
  <component :is="componente" :size="18" :stroke-width="1.5" />
</template>
