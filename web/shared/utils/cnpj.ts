// Espelho de public.normalizar_cnpj / public.cnpj_valido (CNPJ numérico e alfanumérico, IN RFB 2.229/2024)

const PESOS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const PESOS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

export function normalizarCnpj(v: string): string {
  return (v ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '')
}

function digito(base: string, pesos: number[]): number {
  const soma = pesos.reduce((acc, peso, i) => acc + (base.charCodeAt(i) - 48) * peso, 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function cnpjValido(v: string): boolean {
  const c = normalizarCnpj(v)
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(c)) return false
  if (/^(.)\1{13}$/.test(c)) return false
  return Number(c[12]) === digito(c, PESOS_1) && Number(c[13]) === digito(c, PESOS_2)
}

/** Formata XX.XXX.XXX/XXXX-XX progressivamente enquanto o usuário digita. */
export function mascararCnpj(v: string): string {
  const c = normalizarCnpj(v).slice(0, 14)
  const partes: [number, number, string][] = [
    [0, 2, ''],
    [2, 5, '.'],
    [5, 8, '.'],
    [8, 12, '/'],
    [12, 14, '-'],
  ]
  return partes
    .filter(([ini]) => c.length > ini)
    .map(([ini, fim, sep]) => sep + c.slice(ini, fim))
    .join('')
}
