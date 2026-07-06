import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"

export function useProdutos() {
  return useQuery({
    queryKey: ["produtos"],
    staleTime: 60 * 60_000,
    queryFn: ({ signal }) => unwrap(api.GET("/produtos", { signal })),
  })
}
