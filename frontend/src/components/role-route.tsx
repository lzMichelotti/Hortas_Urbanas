import type { ReactNode } from "react"
import { Navigate } from "react-router"
import { useMe } from "@/features/auth/use-me"
import type { components } from "@/lib/api/schema"
import { Carregando } from "@/components/feedback"

type Privilegio = components["schemas"]["Privilegio"]

export function RoleRoute({ roles, children }: { roles: Privilegio[]; children: ReactNode }) {
  const me = useMe()
  if (me.isPending) {
    return <Carregando />
  }
  if (!me.data || !roles.includes(me.data.privilegio)) {
    return <Navigate to="/painel" replace />
  }
  return <>{children}</>
}
