/** Cache em memória com validade (TTL) e limite de itens; descarta a entrada menos usada. */
export class CacheTtl<T> {
  private itens = new Map<string, { valor: T; expira: number }>()

  constructor(
    private maxItens: number,
    private ttlMs: number,
    private agora: () => number = Date.now,
  ) {}

  get tamanho(): number {
    return this.itens.size
  }

  get(chave: string): T | undefined {
    const item = this.itens.get(chave)
    if (!item) return undefined
    this.itens.delete(chave)
    if (item.expira <= this.agora()) return undefined
    this.itens.set(chave, item) // reinsere: vira a mais recente
    return item.valor
  }

  set(chave: string, valor: T): void {
    this.itens.delete(chave)
    while (this.itens.size >= this.maxItens) {
      this.itens.delete(this.itens.keys().next().value!)
    }
    this.itens.set(chave, { valor, expira: this.agora() + this.ttlMs })
  }
}
