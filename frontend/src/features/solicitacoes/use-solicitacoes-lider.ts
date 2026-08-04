import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { components } from "@/lib/api/schema"

type StatusPedido = components["schemas"]["StatusPedido"]

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["solicitacoes", "lider"] }),
  })
}

export function useResponderSolicitacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusPedido }) =>
      unwrap(
        api.PATCH("/solicitacoes/{id}/status", {
          params: { path: { id } },
          body: { status },
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["solicitacoes", "lider"] }),
  })
}
