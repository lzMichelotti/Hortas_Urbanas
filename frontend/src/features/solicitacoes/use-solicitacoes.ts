import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { components } from "@/lib/api/schema"

type SolicitacaoCreate = components["schemas"]["SolicitacaoCreate"]

export function useSolicitacoesDoMembro(canteiroId: number | undefined) {
  return useQuery({
    queryKey: ["solicitacoes", canteiroId],
    enabled: canteiroId != null,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/canteiros/{canteiro_id}/solicitacoes", {
          params: { path: { canteiro_id: canteiroId as number } },
          signal,
        }),
      ),
  })
}

export function useCriarSolicitacao(canteiroId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: SolicitacaoCreate; idempotencyKey: string }) =>
      unwrap(
        api.POST("/canteiros/{canteiro_id}/solicitacoes", {
          params: { path: { canteiro_id: canteiroId } },
          headers: { "Idempotency-Key": idempotencyKey },
          body,
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["solicitacoes", canteiroId] }),
  })
}

export function useCancelarSolicitacao(canteiroId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(api.DELETE("/solicitacoes/{id}", { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["solicitacoes", canteiroId] }),
  })
}
