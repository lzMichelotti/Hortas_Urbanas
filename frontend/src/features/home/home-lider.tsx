import { useState } from "react"
import { useSolicitacoesLider } from "@/features/solicitacoes/use-solicitacoes-lider"
import { HortaVitrine } from "@/features/hortas/horta-vitrine"
import { Cena, type Badges } from "@/features/home/cena/cena"
import { cenaLider } from "@/features/home/cena/cena-lider"
import { QuadroMenu, type OpcaoMenu } from "@/features/home/quadro-menu"

const OPCOES_LIDER: OpcaoMenu[] = [
  { label: "Minha horta", img: "/minha-horta.png", to: "/painel/horta" },
  { label: "Meu canteiro", img: "/plantar.png", to: "/painel/meu-canteiro" },
  { label: "Membros", img: "/membros.png", to: "/painel/membros" },
  { label: "Demandas", img: "/demandas.png", to: "/painel/demandas" },
  { label: "Mapa", img: "/mapa.png", to: "/mapa" },
]

export function HomeLider() {
  const [menu, setMenu] = useState(false)

  const solicitacoes = useSolicitacoesLider()
  const pendentes = (solicitacoes.data ?? []).filter((s) => s.status === "ABERTA").length

  const badges: Badges = { solicitacoes: { valor: pendentes } }

  return (
    <div className="absolute inset-x-0 top-0 bottom-0">
      <div aria-hidden className="absolute inset-0 bg-[#5da33f] dark:bg-[#16291c]" />
      <div className="absolute inset-x-0 top-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))]">
        <Cena
          cena={cenaLider}
          badges={badges}
          slots={{ horta: <HortaVitrine /> }}
          aoAbrirFolha={() => setMenu(true)}
        />
      </div>
      <QuadroMenu aberta={menu} aoMudar={setMenu} opcoes={OPCOES_LIDER} />
    </div>
  )
}
