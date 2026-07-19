import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"

export function useProdutividade(hortaId: number | null | undefined) {
  return useQuery({
    queryKey: ["produtividade", hortaId],
    enabled: hortaId != null,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/hortas/{horta_id}/produtividade", {
          params: { path: { horta_id: hortaId as number } },
          signal,
        }),
      ),
  })
}
