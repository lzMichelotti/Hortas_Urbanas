import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"

export function useClima() {
  return useQuery({
    queryKey: ["clima"],
    staleTime: 60 * 60_000, // 1h, casando com o Cache-Control do backend
    queryFn: ({ signal }) => unwrap(api.GET("/clima", { signal })),
  })
}
