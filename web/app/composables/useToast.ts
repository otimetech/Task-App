export type Toast = { id: number; tipo: 'sucesso' | 'erro'; mensagem: string }

let proximoId = 1

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function adicionar(tipo: Toast['tipo'], mensagem: string) {
    const id = proximoId++
    toasts.value = [...toasts.value, { id, tipo, mensagem }]
    if (import.meta.client) {
      setTimeout(() => {
        toasts.value = toasts.value.filter((t) => t.id !== id)
      }, 5000)
    }
  }

  return {
    toasts,
    sucesso: (mensagem: string) => adicionar('sucesso', mensagem),
    erro: (mensagem: string) => adicionar('erro', mensagem),
    fechar: (id: number) => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    },
  }
}
