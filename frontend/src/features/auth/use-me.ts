import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import { isAuthenticated } from "@/lib/auth/session"

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    enabled: isAuthenticated(),
    queryFn: async ({ signal }) => {
      const { cpf: _cpf, ...me } = await unwrap(
        api.GET("/usuarios/me", { signal, cache: "no-store" }),
      )
      return me
    },
  })
}
