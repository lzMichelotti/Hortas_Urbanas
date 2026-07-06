import type { components } from "@/lib/api/schema"
import type { Estagio } from "@/components/plantinha"

type Ciclo = components["schemas"]["CicloRead"]

export const FRACAO_CRESCENDO = 0.45

export function progresso(c: Ciclo): number {
  if (!c.data_plantio || !c.previsao_colheita) return 0
  const ini = new Date(`${c.data_plantio}T00:00:00`).getTime()
  const fim = new Date(`${c.previsao_colheita}T00:00:00`).getTime()
  if (!(fim > ini)) return 0
  return Math.min(1, Math.max(0, (Date.now() - ini) / (fim - ini)))
}

export function estagioDe(c: Ciclo): Estagio {
  if (c.status === "PRONTO_PARA_COLHEITA") return "pronta"
  let p = progresso(c)
  if (c.status === "EM_CRESCIMENTO") p = Math.max(p, 0.3)
  if (p >= 0.78) return "quase"
  if (p >= FRACAO_CRESCENDO) return "crescendo"
  if (p >= 0.15) return "broto"
  return "semente"
}

export function diasRestantes(c: Ciclo): number {
  if (!c.previsao_colheita) return 0
  const fim = new Date(`${c.previsao_colheita}T00:00:00`).getTime()
  return Math.ceil((fim - Date.now()) / 86400000)
}
