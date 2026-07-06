import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { components } from "@/lib/api/schema"

type HortaUpdate = components["schemas"]["HortaUpdate"]

export function useHortas() {
  return useQuery({
    queryKey: ["hortas"],
    queryFn: ({ signal }) => unwrap(api.GET("/hortas", { signal })),
  })
}

export function useHorta(id: number | null | undefined) {
  return useQuery({
    queryKey: ["horta", id],
    enabled: id != null,
    queryFn: ({ signal }) =>
      unwrap(api.GET("/hortas/{id}", { params: { path: { id: id as number } }, signal })),
  })
}

export function useAtualizarHorta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: HortaUpdate }) =>
      unwrap(api.PATCH("/hortas/{id}", { params: { path: { id } }, body })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hortas"] })
      qc.invalidateQueries({ queryKey: ["mapa", "completo"] })
    },
  })
}

export function useDeletarHorta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(api.DELETE("/hortas/{id}", { params: { path: { id } } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hortas"] })
      qc.invalidateQueries({ queryKey: ["mapa", "completo"] })
      qc.invalidateQueries({ queryKey: ["usuarios"] })
    },
  })
}
