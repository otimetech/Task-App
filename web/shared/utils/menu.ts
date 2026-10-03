// Menu lateral (design.md seção 7) e bottom navigation (escopo). rota null = módulo "em breve".
export type ItemMenu = { id: string; rotulo: string; icone: string; rota: string | null; somenteAdmin?: boolean }

export const ITENS_MENU: ItemMenu[] = [
  { id: 'inicio', rotulo: 'Início', icone: 'LayoutGrid', rota: '/' },
  { id: 'equipamentos', rotulo: 'Equipamentos', icone: 'Monitor', rota: null },
  { id: 'ordens', rotulo: 'Ordens de Serviço', icone: 'ClipboardList', rota: null },
  { id: 'agenda', rotulo: 'Preventivas / Agenda', icone: 'CalendarCheck', rota: null },
  { id: 'clientes', rotulo: 'Clientes e Unidades', icone: 'Building2', rota: null },
  { id: 'categorias', rotulo: 'Categorias e Tipos', icone: 'Tags', rota: null },
  { id: 'fabricantes', rotulo: 'Fabricantes', icone: 'Factory', rota: null },
  { id: 'checklists', rotulo: 'Checklists', icone: 'ListChecks', rota: null },
  { id: 'relatorios', rotulo: 'Relatórios', icone: 'FileText', rota: null },
  { id: 'usuarios', rotulo: 'Usuários', icone: 'Users', rota: '/usuarios', somenteAdmin: true },
  { id: 'configuracoes', rotulo: 'Configurações', icone: 'Settings', rota: '/configuracoes', somenteAdmin: true },
]

export const ITENS_BOTTOM_NAV: ItemMenu[] = [
  { id: 'inicio', rotulo: 'Início', icone: 'LayoutGrid', rota: '/' },
  { id: 'ordens', rotulo: 'O.S.', icone: 'ClipboardList', rota: null },
  { id: 'agenda', rotulo: 'Agenda', icone: 'CalendarCheck', rota: null },
  { id: 'clientes', rotulo: 'Clientes', icone: 'Building2', rota: null },
  { id: 'mais', rotulo: 'Mais', icone: 'Menu', rota: null },
]

export function itensMenu(ehAdmin: boolean): ItemMenu[] {
  return ITENS_MENU.filter((i) => ehAdmin || !i.somenteAdmin)
}

export const ROTULO_PAPEL: Record<string, string> = {
  administrador: 'Administrador',
  supervisor: 'Supervisor',
  tecnico: 'Técnico',
}
