import type { components } from "@/lib/api/schema"

export type FonteAgua = components["schemas"]["FonteAgua"]
export type TipoSolo = components["schemas"]["TipoSolo"]
export type NivelVulnerabilidade = components["schemas"]["NivelVulnerabilidade"]
export type PraticaCultivo = components["schemas"]["PraticaCultivo"]

export const FONTES_AGUA: { valor: FonteAgua; label: string }[] = [
  { valor: "pluvial", label: "Água da chuva" },
  { valor: "rede", label: "Rede pública" },
  { valor: "poco", label: "Poço" },
  { valor: "outro", label: "Outro" },
]

export const TIPOS_SOLO: { valor: TipoSolo; label: string }[] = [
  { valor: "argiloso", label: "Argiloso" },
  { valor: "arenoso", label: "Arenoso" },
  { valor: "humoso", label: "Húmus / orgânico" },
  { valor: "misto", label: "Misto" },
]

export const NIVEIS_VULNERABILIDADE: { valor: NivelVulnerabilidade; label: string }[] = [
  { valor: "baixo", label: "Baixo" },
  { valor: "medio", label: "Médio" },
  { valor: "alto", label: "Alto" },
]

export const PRATICAS: { valor: PraticaCultivo; label: string }[] = [
  { valor: "compostagem", label: "Compostagem" },
  { valor: "irrigacao_gotejamento", label: "Irrigação por gotejamento" },
  { valor: "captacao_agua_chuva", label: "Captação de água da chuva" },
  { valor: "controle_biologico", label: "Controle biológico de pragas" },
  { valor: "adubacao_verde", label: "Adubação verde" },
  { valor: "rotacao_culturas", label: "Rotação de culturas" },
  { valor: "sem_agrotoxicos", label: "Sem agrotóxicos" },
  { valor: "mulching", label: "Mulching (cobertura do solo)" },
]

export const UFS: { valor: string; label: string }[] = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
].map((uf) => ({ valor: uf, label: uf }))

function mapaDeRotulos<T extends string>(arr: { valor: T; label: string }[]): Record<T, string> {
  return Object.fromEntries(arr.map((o) => [o.valor, o.label])) as Record<T, string>
}

export const ROTULO_FONTE_AGUA = mapaDeRotulos(FONTES_AGUA)
export const ROTULO_TIPO_SOLO = mapaDeRotulos(TIPOS_SOLO)
export const ROTULO_VULNERABILIDADE = mapaDeRotulos(NIVEIS_VULNERABILIDADE)
export const ROTULO_PRATICA = mapaDeRotulos(PRATICAS)
