import { NavLink } from "react-router"
import { Home as HomeIcon, type LucideIcon, MessagesSquare, Settings } from "lucide-react"
import { useMe } from "@/features/auth/use-me"

interface ItemNav {
  label: string
  icon: LucideIcon
  to: string
  end?: boolean
}

// Todos os papéis têm home de cenário: a nav fica enxuta e as ações moram na cena/menu.
const ITENS: ItemNav[] = [
  { label: "Início", icon: HomeIcon, to: "/painel", end: true },
  { label: "Comunidade", icon: MessagesSquare, to: "/forum" },
  { label: "Config", icon: Settings, to: "/painel/config" },
]

export function PlaquetaNav({ Icone, label, ativo }: { Icone: LucideIcon; label: string; ativo: boolean }) {
  return (
    <span
      className={`relative flex w-full flex-col items-center gap-1 rounded-sm border-[3px] border-[#5b3a1a] px-0.5 py-1.5 shadow-[0_3px_0_#5b3a1a] transition-transform active:translate-y-0.5 active:shadow-[0_1px_0_#5b3a1a] dark:border-[#2a1a0c] dark:shadow-[0_3px_0_#1a0f06] ${
        ativo ? "bg-[#a8703f] dark:bg-[#7a5230]" : "bg-[#8a5a2b] dark:bg-[#553519]"
      }`}
    >
      <span className="absolute left-1 top-1 size-1 rounded-full bg-[#5b3a1a] dark:bg-[#1a0f06]" />
      <span className="absolute right-1 top-1 size-1 rounded-full bg-[#5b3a1a] dark:bg-[#1a0f06]" />
      <span className="absolute bottom-1 left-1 size-1 rounded-full bg-[#5b3a1a] dark:bg-[#1a0f06]" />
      <span className="absolute bottom-1 right-1 size-1 rounded-full bg-[#5b3a1a] dark:bg-[#1a0f06]" />
      <Icone className="size-5 shrink-0 text-[#ffe8c2]" strokeWidth={2.5} aria-hidden />
      <span className="w-full truncate text-center text-[10px] font-bold leading-none text-[#ffe8c2]">{label}</span>
    </span>
  )
}

export function NavInferior() {
  const me = useMe()
  if (!me.data) return null

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-[#5b3a1a] bg-[#5da33f] px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] dark:border-[#0c160f] dark:bg-[#16291c]"
    >
      <ul className="mx-auto flex max-w-sm items-stretch gap-2">
        {ITENS.map((it) => (
          <li key={it.to} className="min-w-0 flex-1">
            <NavLink
              to={it.to}
              end={it.end}
              className="flex min-h-[52px] items-stretch rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {({ isActive }) => <PlaquetaNav Icone={it.icon} label={it.label} ativo={isActive} />}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
