// Data local em YYYY-MM-DD: toISOString() é UTC e, no Brasil, vira "amanhã" depois das 21h.
export function isoLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function daquiA(dias: number) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return isoLocal(d)
}

export const ATALHOS_PREVISAO = [
  { rotulo: "Amanhã", dias: 1 },
  { rotulo: "Em 3 dias", dias: 3 },
  { rotulo: "Em 1 semana", dias: 7 },
]

export const diaMes = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7)

export function textoPrevisao(iso: string) {
  if (iso < daquiA(0)) return `Era para chegar em ${diaMes(iso)}`
  if (iso === daquiA(0)) return "Chega hoje"
  if (iso === daquiA(1)) return "Chega amanhã"
  return `Chega até ${diaMes(iso)}`
}
