import { Suspense } from "react"
import { Outlet } from "react-router"
import { LogOut } from "lucide-react"
import { useMe } from "@/features/auth/use-me"
import { useLogout } from "@/features/auth/use-logout"
import { useLembretesColheita } from "@/features/ciclos/use-lembretes"
import { ROTULO_PAPEL } from "@/features/auth/papeis"
import { RouteBoundary } from "@/components/error-boundary"
import { Carregando } from "@/components/feedback"
import { NavInferior } from "@/components/nav-inferior"
import { Button } from "@/components/ui/button"

export function PainelLayout() {
  const me = useMe()
  const logout = useLogout()
  // Papéis com home de cenário compartilham o cabeçalho de céu e a nav sempre visível.
  const ehCena = me.data?.privilegio === "MEMBRO_CANTEIRO" || me.data?.privilegio === "LIDER_HORTA"
  useLembretesColheita()

  return (
    <div className="flex min-h-svh flex-col bg-hu-bg text-hu-text">
      {ehCena ? (
        <header className="relative flex items-center justify-center bg-[#8fd0ef] px-4 py-2.5 dark:bg-[#171f3a]">
          <button
            type="button"
            onClick={logout}
            className="absolute right-2 top-1/2 flex min-h-11 -translate-y-1/2 items-center gap-1.5 rounded-xl border-2 border-black/20 bg-white/40 px-3 text-sm font-bold text-hu-text transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20"
          >
            <LogOut className="size-5" aria-hidden />
            Sair
          </button>
        </header>
      ) : (
        <header className="flex items-center justify-between gap-3 border-b-4 border-hu-bright bg-hu-panel px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-xs text-hu-text sm:text-sm">Hortas Urbanas</span>
          </div>
          <div className="flex items-center gap-3">
            {me.data && (
              <span className="hidden text-right text-xs leading-tight sm:block">
                {me.data.nome}
                <br />
                <span className="text-hu-muted">{ROTULO_PAPEL[me.data.privilegio]}</span>
              </span>
            )}
            <Button
              onClick={logout}
              variant="outline"
              className="h-11 rounded-lg border-hu-bright bg-transparent text-hu-text hover:bg-black/5"
            >
              Sair
            </Button>
          </div>
        </header>
      )}
      <main
        className={`relative flex-1 overflow-auto p-4 ${
          ehCena
            ? "pb-[calc(4.75rem+env(safe-area-inset-bottom))]"
            : "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-4"
        }`}
      >
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
