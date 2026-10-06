import type { ReactNode } from "react"
import { Navigate } from "react-router"
import { useMe } from "@/features/auth/use-me"
import type { components } from "@/lib/api/schema"
import { Carregando, FalhaAoCarregar } from "@/components/feedback"

type Privilegio = components["schemas"]["Privilegio"]

export function RoleRoute({ roles, children }: { roles: Privilegio[]; children: ReactNode }) {
  const me = useMe()
  if (me.isPending) {
    return <Carregando />
  }
  // Sem isso, uma falha de rede manda pra /painel como se fosse falta de permissão.
  if (me.isLoadingError) return <FalhaAoCarregar className="mx-auto mt-6 max-w-2xl" />
  if (!me.data || !roles.includes(me.data.privilegio)) {
    return <Navigate to="/painel" replace />
  }
  return <>{children}</>
}
