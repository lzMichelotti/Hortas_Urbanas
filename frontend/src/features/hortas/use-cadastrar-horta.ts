import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { components } from "@/lib/api/schema"

type Body = components["schemas"]["HortaRegistroCreate"]

export function useCadastrarHorta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Body) => unwrap(api.POST("/hortas/registro", { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mapa", "completo"] }),
  })
}
