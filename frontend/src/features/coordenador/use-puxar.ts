import { useRef, useState, type TouchEvent } from "react"

export const DISTANCIA_PX = 70

// Gesto "puxar para baixo" sem biblioteca: só vale com a tela já no topo do painel
// (a rolagem do painel é a do <main>, não a da janela).
export function usePuxarParaAtualizar(atualizar: () => Promise<unknown>) {
  const [puxada, setPuxada] = useState(0)
  const [atualizando, setAtualizando] = useState(false)
  const inicio = useRef<number | null>(null)

  const gestos = {
    onTouchStart: (e: TouchEvent<HTMLElement>) => {
      const rolagem = e.currentTarget.closest("main")
      inicio.current = rolagem && rolagem.scrollTop > 0 ? null : e.touches[0].clientY
    },
    onTouchMove: (e: TouchEvent<HTMLElement>) => {
      if (inicio.current == null || atualizando) return
      const d = e.touches[0].clientY - inicio.current
      setPuxada(d > 0 ? Math.min(d / 2, DISTANCIA_PX * 1.4) : 0)
    },
    onTouchEnd: () => {
      if (puxada >= DISTANCIA_PX) {
        setAtualizando(true)
        void atualizar().finally(() => setAtualizando(false))
      }
      setPuxada(0)
      inicio.current = null
    },
  }

  return { gestos, puxada, atualizando }
}
