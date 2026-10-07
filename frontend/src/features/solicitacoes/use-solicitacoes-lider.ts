import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import { corpoAtualizacao, invalidarPedidos, type AtualizacaoPedido } from "@/features/demandas/use-demandas"

export function useSolicitacoesLider() {
  return useQuery({
    queryKey: ["solicitacoes", "lider"],
    queryFn: ({ signal }) => unwrap(api.GET("/solicitacoes", { signal })),
  })
}

export function useEncaminharSolicitacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, encaminhada }: { id: number; encaminhada: boolean }) =>
      unwrap(
        api.PATCH("/solicitacoes/{id}/encaminhamento", {
          params: { path: { id } },
          body: { encaminhada },
        }),
      ),
    onSuccess: () => invalidarPedidos(qc),
  })
}

export function useResponderSolicitacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...atualizacao }: AtualizacaoPedido & { id: number }) =>
      unwrap(
        api.PATCH("/solicitacoes/{id}/status", {
          params: { path: { id } },
          body: corpoAtualizacao(atualizacao),
        }),
      ),
    onSuccess: () => invalidarPedidos(qc),
  })
}
