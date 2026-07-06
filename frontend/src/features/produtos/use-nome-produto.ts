import { useMemo } from "react"
import { useProdutos } from "@/features/produtos/use-produtos"

export function useNomeProduto() {
  const produtos = useProdutos()
  return useMemo(() => {
    const mapa = new Map<number, string>()
    produtos.data?.forEach((p) => mapa.set(p.id, p.nome))
    return (id: number | null | undefined) => (id != null ? (mapa.get(id) ?? `#${id}`) : "—")
  }, [produtos.data])
}
