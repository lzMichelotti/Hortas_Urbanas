import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { components } from "@/lib/api/schema"

type CicloCreate = components["schemas"]["CicloCreate"]
type CicloUpdate = components["schemas"]["CicloUpdate"]
type StatusCiclo = components["schemas"]["StatusCiclo"]
type MotivoPerda = components["schemas"]["MotivoPerda"]

export function useCiclos(canteiroId: number | undefined) {
  return useQuery({
    queryKey: ["ciclos", canteiroId],
    enabled: canteiroId != null,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/canteiros/{canteiro_id}/ciclos", {
          params: { path: { canteiro_id: canteiroId as number } },
          signal,
        }),
      ),
  })
}

export function usePlantar(canteiroId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CicloCreate; idempotencyKey: string }) =>
      unwrap(
        api.POST("/canteiros/{canteiro_id}/ciclos", {
          params: { path: { canteiro_id: canteiroId } },
          body,
          headers: { "Idempotency-Key": idempotencyKey },
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ciclos", canteiroId] }),
  })
}

export function useColher(canteiroId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(
        api.PATCH("/ciclos/{id}", {
          params: { path: { id } },
          body: { status: "COLHIDO", data_colheita_real: new Date().toISOString().slice(0, 10) },
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ciclos", canteiroId] }),
  })
}

export function useAtualizarStatusCiclo(canteiroId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      motivo_perda,
      observacao_perda,
    }: { id: number; status: StatusCiclo; motivo_perda?: MotivoPerda; observacao_perda?: string }) => {
      const body: CicloUpdate = { status }
      // A API recusa motivo sem PERDIDO — só envia o que o status comporta.
      if (motivo_perda) body.motivo_perda = motivo_perda
      if (observacao_perda) body.observacao_perda = observacao_perda
      return unwrap(api.PATCH("/ciclos/{id}", { params: { path: { id } }, body }))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ciclos", canteiroId] }),
  })
}
