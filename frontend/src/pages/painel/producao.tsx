import { useState } from "react"
import { CalendarDays, CloudRain, Leaf, Sprout } from "lucide-react"
import { useProducao } from "@/features/admin/use-painel-admin"
import { Barra, Cartao } from "@/features/admin/blocos"
import { rotuloMotivo, type Motivo } from "@/features/ciclos/motivos"
import { Voltar } from "@/components/voltar"
import { Aviso, Carregando } from "@/components/feedback"
import { cn, plural } from "@/lib/utils"

const PERIODOS = [
  { label: "3 meses", dias: 90 },
  { label: "6 meses", dias: 180 },
  { label: "1 ano", dias: 365 },
]

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

const CORES = {
  plantios: { barra: "bg-hu-bright", texto: "text-hu-bright" },
  colheitas: { barra: "bg-hu-terracotta", texto: "text-hu-terracotta" },
  perdas: { barra: "bg-red-500/80", texto: "text-red-600 dark:text-red-400" },
}

function rotuloMes(mes: string): string {
  const [ano, m] = mes.split("-")
  return `${MESES[Number(m) - 1]}/${ano.slice(2)}`
}

function diasAtras(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().slice(0, 10)
}

function Legenda() {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-hu-muted">
      {(["plantios", "colheitas", "perdas"] as const).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2.5 rounded-full", CORES[k].barra)} />
          {k}
        </span>
      ))}
    </p>
  )
}

export function ProducaoPage() {
  const [dias, setDias] = useState(90)
  const producao = useProducao(diasAtras(dias))

  if (producao.isPending) return <Carregando />

  if (producao.isError || !producao.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <Aviso variante="erro" className="mt-6" aoTentarNovamente={() => producao.refetch()}>
          Não foi possível carregar a produção. Veja sua internet e tente de novo.
        </Aviso>
      </div>
    )
  }

  const d = producao.data
  const teto = Math.max(
    1,
    ...d.serie_mensal.flatMap((p) => [p.plantios, p.colheitas, p.perdas]),
  )
  const totalPerdas = d.perdas_por_motivo.reduce((s, p) => s + p.total, 0)
  const perdasClima = d.perdas_por_motivo
    .filter((p) => p.climatico)
    .reduce((s, p) => s + p.total, 0)

  return (
    <div
      className={cn(
        "mx-auto flex max-w-2xl flex-col gap-4 pb-4 transition-opacity",
        producao.isPlaceholderData && "opacity-60",
      )}
    >
      <Voltar />
      <h1 className="font-pixel text-sm leading-relaxed text-hu-bright">Produção e perdas</h1>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
        {PERIODOS.map((p) => (
          <button
            key={p.dias}
            type="button"
            onClick={() => setDias(p.dias)}
            aria-pressed={dias === p.dias}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-xl border-2 px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/40",
              dias === p.dias
                ? "border-hu-bright bg-hu-bright text-hu-bg"
                : "border-hu-soft bg-hu-panel text-hu-text hover:bg-black/5",
            )}
          >
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            {p.label}
          </button>
        ))}
      </div>

      {d.serie_mensal.length === 0 ? (
        <p className="rounded-2xl border-4 border-hu-soft bg-hu-panel p-6 text-center text-hu-text">
          Nenhum plantio, colheita ou perda registrado nesse período.
        </p>
      ) : (
        <Cartao titulo="Mês a mês" icone={Sprout}>
          <Legenda />
          <ul className="mt-3 flex flex-col gap-3">
            {d.serie_mensal.map((p) => (
              <li key={p.mes} className="flex flex-col gap-1">
                <span className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-bold text-hu-text">{rotuloMes(p.mes)}</span>
                  <span className="flex gap-2 font-bold">
                    <span className={CORES.plantios.texto}>{p.plantios}</span>
                    <span className={CORES.colheitas.texto}>{p.colheitas}</span>
                    <span className={CORES.perdas.texto}>{p.perdas}</span>
                  </span>
                </span>
                <span aria-hidden className="flex flex-col gap-0.5">
                  {(["plantios", "colheitas", "perdas"] as const).map((k) => (
                    <span key={k} className="h-2 w-full overflow-hidden rounded-full bg-hu-soft/40">
                      <span
                        className={cn("block h-full rounded-full", CORES[k].barra)}
                        style={{ width: `${(p[k] / teto) * 100}%` }}
                      />
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {totalPerdas > 0 && (
        <Cartao titulo="Por que se perdeu" icone={CloudRain}>
          <p className="text-sm text-hu-muted">
            {perdasClima === 0
              ? "Nenhuma perda por causa do clima nesse período."
              : `${plural(perdasClima, "perda", "perdas")} de ${totalPerdas} ${
                  perdasClima === 1 ? "foi" : "foram"
                } por causa do clima.`}
          </p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {d.perdas_por_motivo.map((p) => (
              <Barra
                key={p.motivo}
                rotulo={rotuloMotivo(p.motivo as Motivo) ?? "Não informado"}
                valor={p.total}
                total={totalPerdas}
                cor={p.climatico ? "bg-amber-500" : "bg-hu-soft"}
              />
            ))}
          </ul>
          <p className="mt-3 text-sm text-hu-muted">
            <span aria-hidden className="mr-1.5 inline-block size-2.5 rounded-full bg-amber-500 align-middle" />
            Em laranja, as perdas ligadas ao clima.
          </p>
        </Cartao>
      )}

      {d.por_horta.length > 0 && (
        <Cartao titulo="Horta por horta" icone={Leaf}>
          <ul className="flex flex-col gap-2">
            {d.por_horta.map((h) => (
              <li
                key={h.horta_id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-hu-soft/40 pb-2 last:border-0 last:pb-0"
              >
                <span className="font-bold text-hu-text">{h.nome}</span>
                <span className="flex gap-3 text-sm">
                  <span className={CORES.plantios.texto}>{h.plantios} plantios</span>
                  <span className={CORES.colheitas.texto}>{h.colheitas} colheitas</span>
                  <span className={CORES.perdas.texto}>{h.perdas} perdas</span>
                </span>
                {h.atrasados > 0 && (
                  <span className="w-full text-sm font-bold text-amber-600 dark:text-amber-400">
                    {plural(h.atrasados, "plantio passou", "plantios passaram")} do prazo de colheita
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {d.produtos.length > 0 && (
        <Cartao titulo="O que mais se planta" icone={Sprout}>
          <ul className="flex flex-col gap-2.5">
            {d.produtos.map((p) => (
              <Barra
                key={p.produto_id}
                rotulo={p.perdas > 0 ? `${p.nome} · ${p.perdas} ${p.perdas === 1 ? "perdido" : "perdidos"}` : p.nome}
                valor={p.plantios}
                total={d.produtos[0]?.plantios ?? 1}
              />
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  )
}
