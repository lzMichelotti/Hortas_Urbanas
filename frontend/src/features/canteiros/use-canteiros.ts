import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { components } from "@/lib/api/schema"

type CanteiroCreate = components["schemas"]["CanteiroCreate"]
type CanteiroUpdate = components["schemas"]["CanteiroUpdate"]

// staleTime igual ao de useMeuCanteiro: a chave é compartilhada e a validade é
// avaliada por observer — valores diferentes fariam esta tela refetchar à toa.
export function useCanteiros() {
  return useQuery({
    queryKey: ["canteiros"],
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => unwrap(api.GET("/canteiros", { signal })),
  })
}

export function useCriarCanteiro(hortaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CanteiroCreate) =>
      unwrap(
        api.POST("/hortas/{horta_id}/canteiros", {
          params: { path: { horta_id: hortaId } },
          body,
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["canteiros"] }),
  })
}

export function useAtualizarCanteiro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CanteiroUpdate }) =>
      unwrap(
        api.PATCH("/canteiros/{id}", {
          params: { path: { id } },
          body,
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["canteiros"] }),
  })
}

export function useDeletarCanteiro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(api.DELETE("/canteiros/{id}", { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["canteiros"] }),
  })
}
