import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { components } from "@/lib/api/schema"

type DemandaCreate = components["schemas"]["DemandaCreate"]
type StatusPedido = components["schemas"]["StatusPedido"]

// previsao: undefined = não mexe; null = apaga.
export type AtualizacaoPedido = { status: StatusPedido; previsao?: string | null }

export const corpoAtualizacao = ({ status, previsao }: AtualizacaoPedido) =>
  previsao === undefined ? { status } : { status, previsao_entrega: previsao }

// Um mesmo pedido aparece para o membro, o líder e o admin.
export function invalidarPedidos(qc: QueryClient) {
  for (const queryKey of [["demandas"], ["demandas-membro"], ["solicitacoes"], ["admin-pedidos"]]) {
    qc.invalidateQueries({ queryKey })
  }
}

export function useDemandas() {
  return useQuery({
    queryKey: ["demandas"],
    queryFn: ({ signal }) => unwrap(api.GET("/demandas", { signal })),
  })
}

export function useCriarDemanda(hortaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: DemandaCreate; idempotencyKey: string }) =>
      unwrap(
        api.POST("/hortas/{horta_id}/demandas", {
          params: { path: { horta_id: hortaId } },
          headers: { "Idempotency-Key": idempotencyKey },
          body,
        }),
      ),
    onSuccess: () => invalidarPedidos(qc),
  })
}

export function useAtualizarStatusDemanda(hortaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ demandaId, ...atualizacao }: AtualizacaoPedido & { demandaId: number }) =>
      unwrap(
        api.PATCH("/hortas/{horta_id}/demandas/{demanda_id}/status", {
          params: { path: { horta_id: hortaId, demanda_id: demandaId } },
          body: corpoAtualizacao(atualizacao),
        }),
      ),
    onSuccess: () => invalidarPedidos(qc),
  })
}

export function useAtualizarStatusDemandaAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ hortaId, demandaId, ...atualizacao }: AtualizacaoPedido & { hortaId: number; demandaId: number }) =>
      unwrap(
        api.PATCH("/hortas/{horta_id}/demandas/{demanda_id}/status", {
          params: { path: { horta_id: hortaId, demanda_id: demandaId } },
          body: corpoAtualizacao(atualizacao),
        }),
      ),
    onSuccess: () => invalidarPedidos(qc),
  })
}

export function useDeletarDemanda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(api.DELETE("/demandas/{id}", { params: { path: { id } } })),
    onSuccess: () => invalidarPedidos(qc),
  })
}

export function useEncaminharDemanda(hortaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ demandaId, encaminhada }: { demandaId: number; encaminhada: boolean }) =>
      unwrap(
        api.PATCH("/hortas/{horta_id}/demandas/{demanda_id}/encaminhamento", {
          params: { path: { horta_id: hortaId, demanda_id: demandaId } },
          body: { encaminhada },
        }),
      ),
    onSuccess: () => invalidarPedidos(qc),
  })
}

export function useDemandasDoMembro(canteiroId: number | undefined) {
  return useQuery({
    queryKey: ["demandas-membro", canteiroId],
    enabled: canteiroId != null,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/canteiros/{canteiro_id}/demandas", {
          params: { path: { canteiro_id: canteiroId as number } },
          signal,
        }),
      ),
  })
}

export function useCriarDemandaMembro(canteiroId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: DemandaCreate; idempotencyKey: string }) =>
      unwrap(
        api.POST("/canteiros/{canteiro_id}/demandas", {
          params: { path: { canteiro_id: canteiroId } },
          headers: { "Idempotency-Key": idempotencyKey },
          body,
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demandas-membro", canteiroId] }),
  })
}

export function useCancelarDemandaMembro(canteiroId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(
        api.DELETE("/canteiros/{canteiro_id}/demandas/{id}", {
          params: { path: { canteiro_id: canteiroId, id } },
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demandas-membro", canteiroId] }),
  })
}
