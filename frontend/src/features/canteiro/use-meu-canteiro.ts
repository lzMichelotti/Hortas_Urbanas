import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import { useMe } from "@/features/auth/use-me"
import type { components } from "@/lib/api/schema"

type Canteiro = components["schemas"]["CanteiroRead"]

// Mesma queryKey de useCanteiros(): é a mesma requisição, então é um cache só.
// O recorte "o meu" sai por select — para MEMBRO a API já devolve só o dele,
// para LIDER devolve a horta inteira (e ele também pode ter canteiro próprio).
export function useMeuCanteiro(habilitado = true) {
  const me = useMe()
  const meuId = me.data?.id

  const selecionarMeu = useCallback(
    (lista: Canteiro[]) => lista.find((c) => c.usuario_id === meuId) ?? null,
    [meuId],
  )

  return useQuery({
    queryKey: ["canteiros"],
    enabled: habilitado && meuId != null,
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => unwrap(api.GET("/canteiros", { signal })),
    select: selecionarMeu,
  })
}
