import { useState } from "react"
import { AlertTriangle, ClipboardList, Flag } from "lucide-react"
import { usePedidosAdmin } from "@/features/admin/use-painel-admin"
import { MunicipioVitrine } from "@/features/hortas/municipio-vitrine"
import { Cena, type Badges } from "@/features/home/cena/cena"
import { cenaAdmin } from "@/features/home/cena/cena-admin"
import { QuadroMenu, type OpcaoMenu } from "@/features/home/quadro-menu"

// "Cadastrar horta" mora dentro de Hortas (botão no topo da lista) — sem atalho duplicado.
const OPCOES_ADMIN: OpcaoMenu[] = [
  { label: "Resumo", icon: ClipboardList, to: "/painel/resumo" },
  { label: "Hortas", img: "/minha-horta.png", to: "/painel/hortas" },
  { label: "Usuários", img: "/membros.png", to: "/painel/usuarios" },
  { label: "Denúncias", icon: Flag, to: "/painel/moderacao" },
  { label: "Zonas de risco", icon: AlertTriangle, to: "/painel/riscos" },
  { label: "Mapa", img: "/mapa.png", to: "/mapa" },
]

export function HomeAdmin() {
  const [menu, setMenu] = useState(false)

  const pedidos = usePedidosAdmin()
  const atencao = (pedidos.data ?? []).filter(
    (p) => (p.status === "ABERTA" || p.status === "EM_ATENDIMENTO") && (p.atraso != null || p.encaminhada),
  ).length

  const badges: Badges = { demandas: { valor: atencao } }

  return (
    <div className="absolute inset-x-0 top-0 bottom-0">
      <div aria-hidden className="absolute inset-0 bg-[#5da33f] dark:bg-[#16291c]" />
      <div className="absolute inset-x-0 top-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))]">
        <Cena
          cena={cenaAdmin}
          badges={badges}
          slots={{ hortas: <MunicipioVitrine /> }}
          aoAbrirFolha={() => setMenu(true)}
        />
      </div>
      <QuadroMenu aberta={menu} aoMudar={setMenu} opcoes={OPCOES_ADMIN} />
    </div>
  )
}
