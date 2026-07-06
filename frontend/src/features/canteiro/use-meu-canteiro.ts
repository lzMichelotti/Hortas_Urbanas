import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"

export function useMeuCanteiro(habilitado = true) {
  return useQuery({
    queryKey: ["canteiros", "meu"],
    enabled: habilitado,
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => unwrap(api.GET("/canteiros", { signal })),
    select: (lista) => lista[0] ?? null,
  })
}
