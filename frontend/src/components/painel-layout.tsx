import { Suspense } from "react"
import { Outlet, useLocation } from "react-router"
import { useLembretesColheita } from "@/features/ciclos/use-lembretes"
import { RouteBoundary } from "@/components/error-boundary"
import { Carregando } from "@/components/feedback"
import { NavInferior } from "@/components/nav-inferior"

export function PainelLayout() {
  useLembretesColheita()
  const naInicio = useLocation().pathname === "/painel"

  return (
    <div className="flex min-h-svh flex-col bg-hu-bg text-hu-text">
      <div
        aria-hidden
        className={`h-[calc(1rem+env(safe-area-inset-top))] ${naInicio ? "bg-[#8fd0ef] dark:bg-[#171f3a]" : "bg-hu-bg"}`}
      />
      <main className="relative flex-1 overflow-auto p-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
        <RouteBoundary compacto>
          <Suspense fallback={<Carregando />}>
            <Outlet />
          </Suspense>
        </RouteBoundary>
      </main>
      <NavInferior />
    </div>
  )
}
