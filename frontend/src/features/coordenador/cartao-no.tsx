import type { ReactNode } from "react"
import { BatteryMedium, Clock, Droplets, Sprout, Thermometer, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  classeSolo,
  estaParado,
  textoBateria,
  textoHoraLeitura,
  textoSolo,
  textoVisto,
  valorOuProblema,
} from "./classificacao"
import type { NoCoordenador } from "./tipos"

const grau = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} °C`
const pct = (v: number) => `${Math.round(v)}%`

export function CartaoNo({ no }: { no: NoCoordenador }) {
  const parado = estaParado(no)
  const l = no.ultima_leitura
  const bateria = textoBateria(no)
  const arSemResposta = l != null && l.estados.temperatura === "erro" && l.estados.umidade_ar === "erro"

  return (
    <section
      className={cn(
        "rounded-2xl border-2 bg-hu-panel p-4 text-hu-text",
        parado ? "border-amber-500" : "border-hu-soft",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-lg font-bold">{no.cadastrado ? no.nome : "Sensor sem nome"}</h2>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-sm font-bold",
            parado ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-hu-bright/20 text-hu-text",
          )}
        >
          {parado ? "Parado" : "Funcionando"}
        </span>
      </div>

      {l == null ? (
        <p className="mt-3 text-base text-hu-muted">Ainda não mandou nenhuma leitura.</p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {arSemResposta ? (
            <Medida icone={Thermometer} problema rotulo="sensor do ar" className="col-span-2">
              Sem resposta
            </Medida>
          ) : (
            <>
              <Medida icone={Thermometer} problema={l.estados.temperatura !== "ok"} rotulo="temperatura">
                {valorOuProblema(l.temperatura_c, l.estados.temperatura, grau)}
              </Medida>
              <Medida icone={Droplets} problema={l.estados.umidade_ar !== "ok"} rotulo="umidade do ar">
                {valorOuProblema(l.umidade_ar_pct, l.estados.umidade_ar, pct)}
              </Medida>
            </>
          )}
          <Medida
            icone={Sprout}
            problema={classeSolo(l) !== "umido"}
            rotulo={l.solo_pct != null && l.estados.solo === "ok" ? pct(l.solo_pct) : "solo"}
          >
            {textoSolo(l)}
          </Medida>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-hu-soft/40 pt-3 text-sm text-hu-muted">
        <span className={cn("flex items-center gap-1.5", parado && "font-bold text-amber-700 dark:text-amber-300")}>
          <Clock className="size-4 shrink-0" aria-hidden />
          {textoVisto(no)}
          {l && ` · ${textoHoraLeitura(l.hora)}`}
        </span>
        {bateria && (
          <span className="flex items-center gap-1.5">
            <BatteryMedium className="size-4 shrink-0" aria-hidden />
            {bateria}
          </span>
        )}
      </div>
    </section>
  )
}

function Medida({
  icone: Icone,
  problema,
  rotulo,
  className,
  children,
}: {
  icone: LucideIcon
  problema: boolean
  rotulo: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1 text-center", className)}>
      <Icone className={cn("size-8", problema ? "text-amber-500" : "text-hu-bright")} aria-hidden />
      <span
        className={cn("text-base font-bold leading-tight", problema && "text-amber-700 dark:text-amber-300")}
      >
        {children}
      </span>
      <span className="text-sm text-hu-muted">{rotulo}</span>
    </div>
  )
}
