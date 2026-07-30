import { diasRestantes } from "@/features/ciclos/crescimento"
import type { components } from "@/lib/api/schema"

type Ciclo = components["schemas"]["CicloRead"]
type StatusCiclo = components["schemas"]["StatusCiclo"]

export const STATUS: Record<StatusCiclo, { rotulo: string; cor: string }> = {
  PLANTADO: { rotulo: "Plantado", cor: "bg-hu-soft text-hu-text" },
  EM_CRESCIMENTO: { rotulo: "Crescendo", cor: "bg-hu-bright text-hu-bg" },
  PRONTO_PARA_COLHEITA: { rotulo: "Pronto p/ colher", cor: "bg-amber-400 text-black" },
  COLHIDO: { rotulo: "Colhido ✓", cor: "bg-hu-soft text-hu-text" },
  PERDIDO: { rotulo: "Perdido", cor: "bg-red-500 text-white" },
}

export const ATIVOS: StatusCiclo[] = ["PLANTADO", "EM_CRESCIMENTO", "PRONTO_PARA_COLHEITA"]

export const dataBR = (d: string) => d.split("-").reverse().join("/")

/** Prazo em palavras — "faltam 5 dias" diz mais que uma data para quem está se organizando. */
export function prazoEmPalavras(c: Ciclo): { texto: string; urgente: boolean } {
  const dias = diasRestantes(c)
  const pronta = c.status === "PRONTO_PARA_COLHEITA"

  // O atraso vem antes do "pronta": esperando há 26 dias é o que o líder precisa ver.
  if (dias < 0) {
    const atraso = Math.abs(dias)
    const quanto = `${atraso} ${atraso === 1 ? "dia" : "dias"}`
    return { texto: pronta ? `esperando há ${quanto}` : `passou do ponto há ${quanto}`, urgente: true }
  }

  if (pronta) return { texto: "pronta pra colher", urgente: true }
  if (dias === 0) return { texto: "colher hoje", urgente: true }
  if (dias === 1) return { texto: "colher amanhã", urgente: true }
  return { texto: `faltam ${dias} dias`, urgente: false }
}
