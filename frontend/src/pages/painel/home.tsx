import { Link } from "react-router"
import {
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  Home as HomeIcon,
  Inbox,
  Leaf,
  type LucideIcon,
  Map,
  Megaphone,
  MessageSquare,
  ShoppingBasket,
  Sprout,
  Users,
} from "lucide-react"
import { useMe } from "@/features/auth/use-me"
import { useCanteiros } from "@/features/canteiros/use-canteiros"
import { useSolicitacoesLider } from "@/features/solicitacoes/use-solicitacoes-lider"
import { useDemandas } from "@/features/demandas/use-demandas"
import type { components } from "@/lib/api/schema"
import { Carregando } from "@/components/feedback"
import { HOME_DO_PAPEL } from "@/features/home"

type Privilegio = components["schemas"]["Privilegio"]
interface ItemHome {
  label: string
  icon: LucideIcon
  to: string
  img?: string
}

const ITENS: Record<Privilegio, ItemHome[]> = {
  ADMIN_SUPREMO: [
    { label: "Cadastrar horta", icon: Sprout, to: "/painel/cadastrar" },
    { label: "Hortas", icon: Leaf, to: "/painel/hortas" },
    { label: "Usuários", icon: Users, to: "/painel/usuarios" },
    { label: "Demandas", icon: Inbox, to: "/painel/admin-demandas", img: "/demandas.png" },
    { label: "Zonas de risco", icon: AlertTriangle, to: "/painel/riscos" },
    { label: "Mapa", icon: Map, to: "/mapa", img: "/mapa.png" },
  ],
  LIDER_HORTA: [
    { label: "Minha horta", icon: HomeIcon, to: "/painel/horta", img: "/minha-horta.png" },
    { label: "Solicitações", icon: ClipboardCheck, to: "/painel/solicitacoes", img: "/solicitacoes.png" },
    { label: "Demandas", icon: Megaphone, to: "/painel/demandas", img: "/demandas.png" },
    { label: "Membros", icon: Users, to: "/painel/membros", img: "/membros.png" },
    { label: "Mapa", icon: Map, to: "/mapa", img: "/mapa.png" },
  ],
  MEMBRO_CANTEIRO: [
    { label: "Plantar", icon: Sprout, to: "/painel/plantar", img: "/plantar.png" },
    { label: "Colher", icon: ShoppingBasket, to: "/painel/colher", img: "/colher.png" },
    { label: "Calendário", icon: CalendarDays, to: "/painel/calendario", img: "/calendario.png" },
    { label: "Pedidos", icon: MessageSquare, to: "/painel/comunidade", img: "/meus-pedidos.png" },
    { label: "Mapa", icon: Map, to: "/mapa", img: "/mapa.png" },
  ],
}

// Reserva a altura do resumo enquanto carrega, evitando o "pulo" da grade (CLS).
function ResumoSkeleton() {
  return <div className="mb-6 h-24 animate-pulse rounded-2xl border-4 border-hu-soft bg-hu-panel/50" aria-hidden />
}

function ResumoAdmin() {
  const demandas = useDemandas()

  if (demandas.isPending) return <ResumoSkeleton />

  const abertas = (demandas.data ?? []).filter((d) => d.status === "ABERTA").length
  const emAndamento = (demandas.data ?? []).filter((d) => d.status === "EM_ATENDIMENTO").length

  if (abertas === 0 && emAndamento === 0) return null

  return (
    <div className={`mb-6 rounded-2xl border-4 bg-hu-panel p-5 text-hu-text ${abertas > 0 ? "border-amber-400" : "border-hu-bright"}`}>
      <p className="mb-3 font-pixel text-xs text-hu-muted">Demandas das hortas</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {abertas > 0 && (
          <span className="font-bold text-amber-400">
            📦 {abertas} aguardando atendimento!
          </span>
        )}
        {emAndamento > 0 && (
          <span className="text-hu-text">
            🔄 {emAndamento} em andamento
          </span>
        )}
      </div>
    </div>
  )
}

function ResumoLider() {
  const solicitacoes = useSolicitacoesLider()
  const canteiros = useCanteiros()
  const demandas = useDemandas()

  if (solicitacoes.isPending || canteiros.isPending || demandas.isPending) return <ResumoSkeleton />

  const pendentes = (solicitacoes.data ?? []).filter((s) => s.status === "PENDENTE").length
  const totalCanteiros = (canteiros.data ?? []).length
  const demandasAbertas = (demandas.data ?? []).filter(
    (d) => d.canteiro_id == null && (d.status === "ABERTA" || d.status === "EM_ATENDIMENTO"),
  ).length
  const materiaisPendentes = (demandas.data ?? []).filter(
    (d) => d.canteiro_id != null && d.status === "ABERTA",
  ).length
  const aguardando = pendentes + materiaisPendentes

  return (
    <div
      className={`mb-6 rounded-2xl border-4 bg-hu-panel p-5 text-hu-text ${
        aguardando > 0 ? "border-amber-400" : "border-hu-bright"
      }`}
    >
      <p className="mb-3 font-pixel text-xs text-hu-muted">Sua horta agora</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {pendentes > 0 ? (
          <span className="font-bold text-amber-400">
            📋 {pendentes} pedido{pendentes > 1 ? "s" : ""} de planta aguardando!
          </span>
        ) : (
          <span className="text-hu-muted">📋 Nenhum pedido de planta</span>
        )}
        {materiaisPendentes > 0 && (
          <span className="font-bold text-amber-400">
            🔧 {materiaisPendentes} pedido{materiaisPendentes > 1 ? "s" : ""} de material!
          </span>
        )}
        <span>🌿 {totalCanteiros} canteiro{totalCanteiros !== 1 ? "s" : ""}</span>
        {demandasAbertas > 0 && (
          <span className="text-hu-muted">
            📦 {demandasAbertas} demanda{demandasAbertas > 1 ? "s" : ""} em aberto
          </span>
        )}
      </div>
    </div>
  )
}

export function PainelHome() {
  const me = useMe()
  if (me.isPending) return <Carregando />

  const HomeDoPapel = me.data ? HOME_DO_PAPEL[me.data.privilegio] : undefined
  if (HomeDoPapel) return <HomeDoPapel />

  const itens = me.data ? ITENS[me.data.privilegio] : []

  return (
    <div className="mx-auto max-w-3xl">
      {me.data?.privilegio === "ADMIN_SUPREMO" && <ResumoAdmin />}
      {me.data?.privilegio === "LIDER_HORTA" && <ResumoLider />}
      <h1 className="font-pixel text-sm text-hu-bright">O que vamos fazer?</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {itens.map((it) => {
          const Icone = it.icon
          return (
            <Link
              key={it.to}
              to={it.to}
              className="flex flex-col items-center gap-3 rounded-2xl border-4 border-hu-bright bg-hu-panel p-6 text-center transition-transform hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/60"
            >
              <span className="flex size-16 items-center justify-center">
                {it.img ? (
                  <img src={it.img} alt="" className="size-16 [image-rendering:pixelated]" />
                ) : (
                  <Icone className="size-12 text-hu-text" strokeWidth={2.5} aria-hidden />
                )}
              </span>
              <span className="font-pixel text-xs leading-relaxed">{it.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
