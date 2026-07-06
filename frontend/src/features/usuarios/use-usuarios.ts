import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { components } from "@/lib/api/schema"

type UsuarioCreate = components["schemas"]["UsuarioCreate"]
type UsuarioUpdate = components["schemas"]["UsuarioUpdate"]

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: ({ signal }) => unwrap(api.GET("/usuarios", { signal })),
  })
}

export function useCriarMembro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UsuarioCreate) =>
      unwrap(api.POST("/usuarios", { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  })
}

export function useRemoverMembro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(api.DELETE("/usuarios/{id}", { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  })
}

export function useAtualizarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UsuarioUpdate }) =>
      unwrap(api.PATCH("/usuarios/{id}", { params: { path: { id } }, body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  })
}
