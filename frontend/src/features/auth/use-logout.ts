import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { clearTokens } from "@/lib/auth/session"
import { persister } from "@/lib/query"

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return () => {
    clearTokens()
    queryClient.clear()
    void persister.removeClient()
    navigate("/", { replace: true })
  }
}
