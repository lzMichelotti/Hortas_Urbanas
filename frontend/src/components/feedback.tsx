import type { ReactNode } from "react"
import { CircleAlert, CircleCheck, Info, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

export function Carregando({
  texto = "Carregando…",
  className,
}: {
  texto?: string
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 py-10 text-hu-muted", className)}
    >
      <span
        className="hu-spin size-9 rounded-full border-4 border-hu-soft border-t-hu-bright"
        aria-hidden
      />
      <p className="text-base">{texto}</p>
    </div>
  )
}

export function EstadoVazio({
  ilustracao,
  children,
  className,
}: {
  ilustracao: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col items-center gap-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-8 text-center text-hu-text",
        className,
      )}
    >
      <img src={ilustracao} alt="" className="h-32 w-auto object-contain sm:h-40" />
      <p className="text-base leading-snug">{children}</p>
    </div>
  )
}

type Variante = "erro" | "sucesso" | "info"

const ESTILO: Record<Variante, { caixa: string; icone: string; Icone: typeof Info; papel: "alert" | "status" }> = {
  erro: {
    caixa: "border-red-400/60 bg-red-500/15 text-red-900 dark:text-red-100",
    icone: "text-red-600",
    Icone: CircleAlert,
    papel: "alert",
  },
  sucesso: {
    caixa: "border-hu-bright/60 bg-hu-bright/15 text-hu-text",
    icone: "text-hu-bright",
    Icone: CircleCheck,
    papel: "status",
  },
  info: {
    caixa: "border-hu-soft bg-black/5 text-hu-muted",
    icone: "text-hu-bright",
    Icone: Info,
    papel: "status",
  },
}

export function Aviso({
  variante = "erro",
  children,
  aoTentarNovamente,
  rotuloTentar = "Tentar de novo",
  className,
}: {
  variante?: Variante
  children: ReactNode
  aoTentarNovamente?: () => void
  rotuloTentar?: string
  className?: string
}) {
  const s = ESTILO[variante]
  const Icone = s.Icone
  return (
    <div
      role={s.papel}
      className={cn("flex flex-col gap-3 rounded-xl border-2 px-4 py-3", s.caixa, className)}
    >
      <div className="flex items-start gap-3">
        <Icone className={cn("mt-0.5 size-6 shrink-0", s.icone)} aria-hidden />
        <p className="text-base leading-snug">{children}</p>
      </div>
      {aoTentarNovamente && (
        <button
          type="button"
          onClick={aoTentarNovamente}
          className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-lg bg-hu-bright px-4 text-base font-bold text-hu-bg hover:bg-hu-bright/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hu-bright/50"
        >
          <RotateCcw className="size-5" aria-hidden />
          {rotuloTentar}
        </button>
      )}
    </div>
  )
}
