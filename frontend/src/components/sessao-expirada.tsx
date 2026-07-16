import { useEffect } from "react"
import { useNavigate } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { EVENTO_SESSAO_EXPIRADA } from "@/lib/auth/session"
import { persister } from "@/lib/query"

export function SessaoExpirada() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    function aoExpirar() {
      queryClient.clear()
      void persister.removeClient()
      navigate("/", { replace: true, state: { sessaoExpirada: true } })
    }
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
  }, [navigate, queryClient])

  return null
}
