import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { useDemandas } from "@/features/demandas/use-demandas"
import { MunicipioVitrine } from "@/features/hortas/municipio-vitrine"
import { Cena, type Badges } from "@/features/home/cena/cena"
import { cenaAdmin } from "@/features/home/cena/cena-admin"
import { QuadroMenu, type OpcaoMenu } from "@/features/home/quadro-menu"

// "Cadastrar horta" mora dentro de Hortas (botão no topo da lista) — sem atalho duplicado.
const OPCOES_ADMIN: OpcaoMenu[] = [
  { label: "Hortas", img: "/minha-horta.png", to: "/painel/hortas" },
  { label: "Usuários", img: "/membros.png", to: "/painel/usuarios" },
  { label: "Zonas de risco", icon: AlertTriangle, to: "/painel/riscos" },
  { label: "Mapa", img: "/mapa.png", to: "/mapa" },
]

export function HomeAdmin() {
  const [menu, setMenu] = useState(false)

  const demandas = useDemandas()
  const abertas = (demandas.data ?? []).filter((d) => d.status === "ABERTA").length

  const badges: Badges = { demandas: { valor: abertas } }

  return (
    <div className="absolute inset-x-0 top-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))]">
      <Cena
        cena={cenaAdmin}
        badges={badges}
        slots={{ hortas: <MunicipioVitrine /> }}
        aoAbrirFolha={() => setMenu(true)}
      />
      <QuadroMenu aberta={menu} aoMudar={setMenu} opcoes={OPCOES_ADMIN} />
    </div>
  )
}
