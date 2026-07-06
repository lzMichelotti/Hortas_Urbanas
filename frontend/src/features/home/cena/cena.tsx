import type { ReactNode } from "react"
import type { BadgeFonte, Cena, FolhaId } from "@/features/home/cena/tipos"
import { ObjetoCenaView, ObjetoConteudoView } from "@/features/home/cena/objeto-cena"
import { CeuClima } from "@/features/home/cena/ceu-clima"

export type Badges = Partial<Record<BadgeFonte, { valor: number; rotulo?: string }>>

function CenarioFundo() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#7ec25a] to-[#5da33f] dark:from-[#1f3a28] dark:to-[#12241a]" />
      <div
        className="absolute inset-0 opacity-15 dark:opacity-25"
        style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(0,0,0,.12) 0 2px, transparent 2px 9px)" }}
      />
      <div className="absolute inset-x-0 top-0 h-[18%] bg-gradient-to-b from-[#8fd0ef] to-transparent dark:from-[#171f3a]" />

      <div className="absolute left-[8%] top-[4%] size-11 rounded-full bg-[#ffd84d] ring-4 ring-[#ffe27a]/60 dark:hidden">
        <img src="/logo.png" alt="" className="absolute inset-0 size-full rounded-full object-contain opacity-20" />
      </div>
      <div className="absolute left-[8%] top-[4%] hidden size-11 rounded-full bg-[#e8ecf5] ring-4 ring-white/30 dark:block">
        <img src="/logo.png" alt="" className="absolute inset-0 size-full rounded-full object-contain opacity-20" />
        <span className="absolute left-2 top-2 size-2 rounded-full bg-black/10" />
        <span className="absolute right-2.5 top-5 size-1.5 rounded-full bg-black/10" />
      </div>

      <div className="absolute left-[30%] top-[6%] hidden size-1 rounded-full bg-white dark:block" />
      <div className="absolute left-[58%] top-[3%] hidden size-1 rounded-full bg-white dark:block" />
      <div className="absolute right-[20%] top-[11%] hidden size-1.5 rounded-full bg-white/90 dark:block" />

      <div className="absolute left-[42%] top-[5%] h-4 w-14 rounded-full bg-white/85 dark:bg-white/10" />
      <div className="absolute right-[12%] top-[8%] h-3.5 w-10 rounded-full bg-white/80 dark:bg-white/10" />
    </div>
  )
}

export function Cena({
  cena,
  badges,
  slots,
  aoAbrirFolha,
}: {
  cena: Cena
  badges?: Badges
  slots?: Partial<Record<string, ReactNode>>
  aoAbrirFolha: (folha: FolhaId) => void
}) {
  const preenche = !cena.proporcao
  return (
    <div
      className={`relative w-full overflow-hidden ${preenche ? "h-full" : "mx-auto max-w-md"}`}
      style={preenche ? undefined : { aspectRatio: cena.proporcao }}
    >
      <CenarioFundo />
      <CeuClima />

      {cena.objetos.map((obj) => {
        if (obj.acao.tipo === "conteudo") {
          return (
            <ObjetoConteudoView key={obj.id} obj={obj}>
              {slots?.[obj.id]}
            </ObjetoConteudoView>
          )
        }
        const b = obj.badge ? badges?.[obj.badge] : undefined
        return (
          <ObjetoCenaView
            key={obj.id}
            obj={obj}
            badge={b?.valor}
            badgeRotulo={b?.rotulo}
            aoAbrirFolha={aoAbrirFolha}
          />
        )
      })}
    </div>
  )
}
