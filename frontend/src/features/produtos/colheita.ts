const MESES_ABREV: Record<string, number> = {
  JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12,
}

const MESES_NOME = [
  "", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

export function estimarDiasColheita(
  inicioColheita?: string | null,
): { min: number; max: number } | null {
  if (!inicioColheita) return null
  const m = inicioColheita.match(/(\d+)(?:\s*-\s*(\d+))?\s*DIAS/i)
  if (!m) return null
  const min = Number(m[1])
  const max = m[2] ? Number(m[2]) : min
  return { min, max }
}

function mesesDaEpoca(epoca?: string | null): [number, number] | null {
  if (!epoca) return null
  const partes = epoca.split("-").map((p) => p.trim().toUpperCase())
  if (partes.length !== 2) return null
  const inicio = MESES_ABREV[partes[0]]
  const fim = MESES_ABREV[partes[1]]
  if (!inicio || !fim) return null
  return [inicio, fim]
}

export function formatarEpoca(epoca?: string | null): string | null {
  if (!epoca) return null
  if (epoca.toUpperCase() === "ANO TODO") return "o ano todo"
  const meses = mesesDaEpoca(epoca)
  if (meses) return `${MESES_NOME[meses[0]]} a ${MESES_NOME[meses[1]]}`
  return epoca.toLowerCase().replace(/-/g, " a ")
}

export function dentroDaEpoca(epoca: string | null | undefined, data: Date): boolean | null {
  if (!epoca) return null
  if (epoca.toUpperCase() === "ANO TODO") return true
  const meses = mesesDaEpoca(epoca)
  if (!meses) return null
  const [inicio, fim] = meses
  const m = data.getMonth() + 1
  return inicio <= fim ? m >= inicio && m <= fim : m >= inicio || m <= fim
}

export function addDias(isoData: string, dias: number): string {
  const d = new Date(`${isoData}T00:00:00`)
  d.setDate(d.getDate() + dias)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, "0")
  const dia = String(d.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

export function formatarDiaMes(isoData: string): string {
  return new Date(`${isoData}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
  })
}
