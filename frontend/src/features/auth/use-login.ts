import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import { setTokens } from "@/lib/auth/session"

interface Credenciais {
  email: string
  cpf: string
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, cpf }: Credenciais) =>
      unwrap(
        api.POST("/token", {
          body: { username: email, password: cpf, scope: "" },
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
      ),
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token)
      queryClient.invalidateQueries({ queryKey: ["me"] })
    },
  })
}
