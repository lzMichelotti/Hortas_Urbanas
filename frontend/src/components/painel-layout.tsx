import { Suspense } from "react"
import { Outlet } from "react-router"
import { useLembretesColheita } from "@/features/ciclos/use-lembretes"
import { RouteBoundary } from "@/components/error-boundary"
import { Carregando } from "@/components/feedback"
import { NavInferior } from "@/components/nav-inferior"

export function PainelLayout() {
  useLembretesColheita()

  return (
    <div className="flex min-h-svh flex-col bg-hu-bg text-hu-text">
      {/* Faixa de céu que preenche a área da barra de status e dá respiro no topo. */}
      <div aria-hidden className="h-[calc(1rem+env(safe-area-inset-top))] bg-[#8fd0ef] dark:bg-[#171f3a]" />
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
