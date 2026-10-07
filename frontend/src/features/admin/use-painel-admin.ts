import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"

// Chaves com prefixos distintos: a allowlist de persistência em lib/query.ts
// filtra por queryKey[0], e só o resumo pode ser gravado no aparelho.
export function usePanorama() {
  return useQuery({
    queryKey: ["admin-panorama"],
    queryFn: ({ signal }) => unwrap(api.GET("/painel/admin/panorama", { signal })),
  })
}

export function useProducao(desde?: string, ate?: string) {
  return useQuery({
    queryKey: ["admin-producao", desde ?? null, ate ?? null],
    queryFn: ({ signal }) =>
      unwrap(api.GET("/painel/admin/producao", { params: { query: { desde, ate } }, signal })),
    placeholderData: keepPreviousData,
  })
}

export function useFichaHorta(id: number | null | undefined) {
  return useQuery({
    queryKey: ["admin-horta", id],
    enabled: id != null,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/painel/admin/hortas/{id}", { params: { path: { id: id as number } }, signal }),
      ),
  })
}

export function useHorticultores() {
  return useQuery({
    queryKey: ["admin-horticultores"],
    queryFn: ({ signal }) => unwrap(api.GET("/painel/admin/horticultores", { signal })),
  })
}

export function useDenuncias() {
  return useQuery({
    queryKey: ["admin-denuncias"],
    queryFn: ({ signal }) => unwrap(api.GET("/forum/denuncias", { signal })),
  })
}

export function useArquivarDenuncia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(api.DELETE("/forum/denuncias/{id}", { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-denuncias"] }),
  })
}

export function usePedidosAdmin(ativo = true) {
  return useQuery({
    queryKey: ["admin-pedidos"],
    enabled: ativo,
    queryFn: ({ signal }) => unwrap(api.GET("/painel/admin/pedidos", { signal })),
  })
}
