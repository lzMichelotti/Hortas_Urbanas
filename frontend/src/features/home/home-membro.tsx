import { useState } from "react"
import { useMeuCanteiro } from "@/features/canteiro/use-meu-canteiro"
import { useSolicitacoesDoMembro } from "@/features/solicitacoes/use-solicitacoes"
import { CanteiroVitrine } from "@/features/canteiro/canteiro-vitrine"
import { Cena, type Badges } from "@/features/home/cena/cena"
import { cenaMembro } from "@/features/home/cena/cena-membro"
import { QuadroMenu } from "@/features/home/quadro-menu"

export function HomeMembro() {
  const [menu, setMenu] = useState(false)

  const canteiro = useMeuCanteiro()
  const solicitacoes = useSolicitacoesDoMembro(canteiro.data?.id)

  const respostas = (solicitacoes.data ?? []).filter(
    (s) => s.status === "APROVADA" || s.status === "RECUSADA",
  ).length

  const badges: Badges = { pedidos: { valor: respostas } }

  return (
    <div className="absolute inset-x-0 top-0 bottom-0">
      <div aria-hidden className="absolute inset-0 bg-[#5da33f] dark:bg-[#16291c]" />
      <div className="absolute inset-x-0 top-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))]">
        <Cena
          cena={cenaMembro}
          badges={badges}
          slots={{ horta: <CanteiroVitrine /> }}
          aoAbrirFolha={() => setMenu(true)}
        />
      </div>
      <QuadroMenu aberta={menu} aoMudar={setMenu} />
    </div>
  )
}
