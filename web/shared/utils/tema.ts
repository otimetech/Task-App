export type CoresEmpresa = { cor_primaria: string | null; cor_secundaria: string | null }

const HEX = /^#[0-9A-Fa-f]{6}$/

function corValida(cor: string | null | undefined): cor is string {
  return typeof cor === 'string' && HEX.test(cor)
}

/** Variáveis CSS da família brand-* a partir das cores da empresa (design.md seção 2.2). */
export function gerarVariaveisTema(cores: CoresEmpresa): Record<string, string> {
  const vars: Record<string, string> = {}
  const p = cores.cor_primaria

  if (corValida(p)) {
    vars['--brand-700'] = p
    vars['--brand-900'] = `color-mix(in srgb, ${p} 55%, black)`
    vars['--brand-600'] = `color-mix(in srgb, ${p} 85%, white)`
    vars['--brand-100'] = `color-mix(in srgb, ${p} 22%, white)`
    vars['--brand-50'] = `color-mix(in srgb, ${p} 8%, white)`
    vars['--brand-50-border'] = `color-mix(in srgb, ${p} 12%, white)`
  }

  if (corValida(cores.cor_secundaria)) {
    vars['--brand-600'] = cores.cor_secundaria
  }

  return vars
}

export function estiloTema(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
}
