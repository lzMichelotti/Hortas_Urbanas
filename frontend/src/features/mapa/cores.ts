import type { components } from "@/lib/api/schema"

type Situacao = components["schemas"]["SituacaoHorta"]
type Nivel = components["schemas"]["NivelRisco"]

export const CENTRO_SANTA_MARIA: [number, number] = [-29.6842, -53.8069]

// Caixa cobrindo o município de Santa Maria/RS + margem. Limita o pan/zoom à
// região para não baixar tiles do mundo todo (economia de dados no 3G).
export const LIMITES_SANTA_MARIA: [[number, number], [number, number]] = [
  [-30.05, -54.25],
  [-29.45, -53.45],
]
export const ZOOM_MIN = 10
export const ZOOM_MAX = 18

export const COR_SITUACAO: Record<Situacao, string> = {
  segura: "#2d6a4f",
  monitoramento: "#457b9d",
  alerta: "#e76f00",
  dentro: "#e63946",
}

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  segura: "Segura",
  monitoramento: "Monitoramento",
  alerta: "Alerta",
  dentro: "Em risco",
}

export const COR_NIVEL: Record<Nivel, string> = {
  alto: "#e63946",
  medio: "#f4a261",
  baixo: "#e9c46a",
}
