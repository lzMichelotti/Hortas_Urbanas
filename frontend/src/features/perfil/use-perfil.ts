import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { components } from "@/lib/api/schema"

type PerfilUpdate = components["schemas"]["PerfilUpdate"]

export function useAtualizarAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (avatar: string) => unwrap(api.PATCH("/usuarios/me", { body: { avatar } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] })
      qc.invalidateQueries({ queryKey: ["forum"] })
    },
  })
}

export function useAtualizarPerfil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PerfilUpdate) => unwrap(api.PATCH("/usuarios/me", { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  })
}
