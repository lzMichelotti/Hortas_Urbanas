import { plural } from "@/lib/utils"
import type { components } from "@/lib/api/schema"

export type ProdutividadeCanteiro = components["schemas"]["ProdutividadeCanteiro"]
export type Bandeira = "vermelha" | "amarela" | "verde"

// Fonte única do critério de bandeira — nenhuma tela reimplementa esta regra.
// Precedência: vermelha > amarela > verde. Mede estado/atenção, não produção.
export function bandeiraDoCanteiro(c: ProdutividadeCanteiro): Bandeira {
  if (c.atrasadas > 0) return "vermelha"
  const parado = c.plantadas + c.crescendo + c.prontas === 0
  if (c.prontas > 0 || c.responsavel == null || parado) return "amarela"
  return "verde"
}


// Motivos legíveis do estado atual, do mais grave ao mais brando. Podem acumular.
export function motivosDoCanteiro(c: ProdutividadeCanteiro): string[] {
  const motivos: string[] = []
  if (c.atrasadas > 0) motivos.push(plural(c.atrasadas, "colheita atrasada", "colheitas atrasadas"))
  if (c.prontas > 0) motivos.push(plural(c.prontas, "pronta pra colher", "prontas pra colher"))
  if (c.responsavel == null) motivos.push("sem responsável")
  if (c.plantadas + c.crescendo + c.prontas === 0) motivos.push("parado, nada plantado")
  return motivos
}

export const BANDEIRA_INFO: Record<
  Bandeira,
  { emoji: string; rotulo: string; ordem: number; chip: string }
> = {
  vermelha: {
    emoji: "🔴",
    rotulo: "Atrasado",
    ordem: 0,
    chip: "border-red-300 bg-red-100 text-red-800 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200",
  },
  amarela: {
    emoji: "🟡",
    rotulo: "Atenção",
    ordem: 1,
    chip: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  },
  verde: {
    emoji: "🟢",
    rotulo: "Em dia",
    ordem: 2,
    chip: "border-green-300 bg-green-100 text-green-800 dark:border-green-500/40 dark:bg-green-500/15 dark:text-green-200",
  },
}
