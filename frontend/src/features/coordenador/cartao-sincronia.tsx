import { CircleCheck, History, Smartphone } from "lucide-react"
import { Atalho } from "@/features/admin/blocos"
import { plural } from "@/lib/utils"
import type { EstadoSincronia } from "./use-sincronia"

export const ROTA_HISTORICO = "/painel/sensores/historico"

export function CartaoSincronia({ estado }: { estado: EstadoSincronia }) {
  if (estado.fase === "parada") return null

  if (estado.fase === "guardando") {
    const { baixadas, faltavam } = estado.progresso
    const pct = faltavam > 0 ? Math.min(100, Math.round((baixadas / faltavam) * 100)) : 100
    return (
      <section role="status" aria-live="polite" className="rounded-2xl border-2 border-hu-soft bg-hu-panel p-4 text-hu-text">
        <p className="flex items-center gap-2 text-base font-bold">
          <Smartphone className="size-6 shrink-0 animate-pulse text-hu-bright" aria-hidden />
          Guardando os dados da horta no celular…
        </p>
        <span aria-hidden className="mt-3 block h-3 w-full overflow-hidden rounded-full bg-hu-soft/50">
          <span className="block h-full rounded-full bg-hu-bright transition-all" style={{ width: `${pct}%` }} />
        </span>
        <p className="mt-2 text-sm text-hu-muted">
          {faltavam > 0 ? `${baixadas.toLocaleString("pt-BR")} de ${faltavam.toLocaleString("pt-BR")}` : "Conferindo…"}
        </p>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {estado.fase === "pronta" ? (
        <p className="flex items-center gap-2 text-base font-bold text-hu-text">
          <CircleCheck className="size-6 shrink-0 text-hu-bright" aria-hidden />
          Dados guardados no celular
          {estado.novas > 0 && (
            <span className="font-normal text-hu-muted">({plural(estado.novas, "nova", "novas")})</span>
          )}
        </p>
      ) : (
        <p className="text-base text-hu-muted">
          A cópia para o celular parou no meio. Ela continua de onde parou da próxima vez.
        </p>
      )}
      <Atalho para={ROTA_HISTORICO} icone={History}>
        Ver o histórico
      </Atalho>
    </div>
  )
}
