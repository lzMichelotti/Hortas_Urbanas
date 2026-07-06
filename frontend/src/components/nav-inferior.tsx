import { NavLink } from "react-router"
import {
  Home as HomeIcon,
  Inbox,
  Leaf,
  type LucideIcon,
  MessagesSquare,
  Settings,
  Sprout,
  Users,
} from "lucide-react"
import { useMe } from "@/features/auth/use-me"
import type { components } from "@/lib/api/schema"

type Privilegio = components["schemas"]["Privilegio"]
interface ItemNav {
  label: string
  icon: LucideIcon
  to: string
  end?: boolean
}

const INICIO: ItemNav = { label: "Início", icon: HomeIcon, to: "/painel", end: true }
const COMUNIDADE: ItemNav = { label: "Comunidade", icon: MessagesSquare, to: "/forum" }
const CONFIG: ItemNav = { label: "Config", icon: Settings, to: "/painel/config" }

// Membro e líder têm home de cenário: a nav fica enxuta e as ações moram na cena/menu.
const NAV_CENA: ItemNav[] = [INICIO, COMUNIDADE, CONFIG]

const NAV: Record<Privilegio, ItemNav[]> = {
  ADMIN_SUPREMO: [
    INICIO,
    { label: "Cadastrar", icon: Sprout, to: "/painel/cadastrar" },
    { label: "Hortas", icon: Leaf, to: "/painel/hortas" },
    { label: "Usuários", icon: Users, to: "/painel/usuarios" },
    { label: "Demandas", icon: Inbox, to: "/painel/admin-demandas" },
    COMUNIDADE,
  ],
  LIDER_HORTA: NAV_CENA,
  MEMBRO_CANTEIRO: NAV_CENA,
}

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
  const privilegio = me.data?.privilegio
  const itens = privilegio ? NAV[privilegio] : []
  if (itens.length === 0) return null

  if (privilegio === "MEMBRO_CANTEIRO" || privilegio === "LIDER_HORTA") {
    return (
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-[#5b3a1a] bg-[#5da33f] px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] dark:border-[#0c160f] dark:bg-[#16291c]"
      >
        <ul className="mx-auto flex max-w-sm items-stretch gap-2">
          {itens.map((it) => (
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

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-hu-bright bg-hu-panel pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {itens.map((it) => {
          const Icone = it.icon
          return (
            <li key={it.to} className="min-w-0 flex-1">
              <NavLink
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-hu-bright ${
                    isActive ? "text-hu-bright" : "text-hu-muted active:bg-white/10"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icone className="size-6 shrink-0" strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                    <span className="w-full truncate text-[11px] font-medium leading-none">{it.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
