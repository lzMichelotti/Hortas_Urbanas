import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"

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
