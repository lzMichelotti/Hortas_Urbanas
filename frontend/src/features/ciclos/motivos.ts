import type { components } from "@/lib/api/schema"

export type Motivo = components["schemas"]["MotivoPerda"]

export const MOTIVOS_CLIMA: { motivo: Motivo; rotulo: string }[] = [
  { motivo: "GEADA", rotulo: "Geada, frio forte" },
  { motivo: "SECA", rotulo: "Seca, faltou água" },
  { motivo: "CHUVA_EXCESSO", rotulo: "Chuva demais, alagou" },
  { motivo: "CALOR", rotulo: "Calor, sol forte" },
]

export const MOTIVOS_OUTROS: { motivo: Motivo; rotulo: string }[] = [
  { motivo: "PRAGA", rotulo: "Praga ou doença" },
  { motivo: "ANIMAIS", rotulo: "Animais" },
  { motivo: "FURTO", rotulo: "Mexeram no canteiro" },
  { motivo: "OUTRO", rotulo: "Outro motivo" },
]

const ROTULOS = Object.fromEntries(
  [...MOTIVOS_CLIMA, ...MOTIVOS_OUTROS].map((m) => [m.motivo, m.rotulo]),
) as Record<Motivo, string>

export function rotuloMotivo(motivo: Motivo | null | undefined): string | null {
  return motivo ? ROTULOS[motivo] ?? null : null
}
