import type { ReactNode } from "react"
import { Link } from "react-router"
import { ArrowRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function Cartao({
  titulo,
  icone: Icone,
  children,
}: {
  titulo: string
  icone: LucideIcon
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border-2 border-hu-soft bg-hu-panel p-4 text-hu-text">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Icone className="size-4 shrink-0 text-hu-bright" aria-hidden />
        {titulo}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export function Numero({
  valor,
  rotulo,
  atencao,
}: {
  valor: ReactNode
  rotulo: string
  atencao?: boolean
}) {
  return (
    <div className="flex flex-col">
      <span
        className={cn(
          "text-2xl font-bold leading-none",
          atencao ? "text-amber-600 dark:text-amber-400" : "text-hu-text",
        )}
      >
        {valor}
      </span>
      <span className="mt-1 text-sm leading-snug text-hu-muted">{rotulo}</span>
    </div>
  )
}

export function Barra({
  rotulo,
  valor,
  total,
  cor = "bg-hu-bright",
  textoOculto = "menos de 5",
}: {
  rotulo: string
  valor: number | null | undefined     // ausente = contagem suprimida pelo backend
  total: number
  cor?: string
  textoOculto?: string
}) {
  const largura = valor != null && total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <li className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-hu-text">{rotulo}</span>
        <span className={valor == null ? "shrink-0 italic text-hu-muted" : "shrink-0 font-bold"}>
          {valor ?? textoOculto}
        </span>
      </span>
      <span aria-hidden className="h-2.5 w-full overflow-hidden rounded-full bg-hu-soft/50">
        <span className={cn("block h-full rounded-full", cor)} style={{ width: `${largura}%` }} />
      </span>
    </li>
  )
}

export function Atalho({
  para,
  icone: Icone,
  children,
}: {
  para: string
  icone: LucideIcon
  children: ReactNode
}) {
  return (
    <Link
      to={para}
      className="flex min-h-12 items-center justify-between gap-2 rounded-xl border-2 border-hu-soft bg-hu-panel px-4 text-sm font-medium text-hu-text hover:bg-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/40"
    >
      <span className="flex items-center gap-2">
        <Icone className="size-4 shrink-0 text-hu-bright" aria-hidden />
        {children}
      </span>
      <ArrowRight className="size-4 shrink-0 text-hu-bright" aria-hidden />
    </Link>
  )
}

export function Fala({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-3">
      <img
        src="/personagem-idoso.webp"
        alt=""
        width={72}
        height={72}
        className="size-16 shrink-0 object-contain sm:size-20"
      />
      <div className="relative flex-1 rounded-2xl border-4 border-hu-bright bg-hu-panel px-4 py-3 text-hu-text">
        <span
          aria-hidden
          className="absolute -left-2.5 top-5 size-3 rotate-45 border-b-4 border-l-4 border-hu-bright bg-hu-panel"
        />
        <p className="text-base font-bold leading-snug">{children}</p>
      </div>
    </div>
  )
}
