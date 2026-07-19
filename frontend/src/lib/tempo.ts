const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" })

export function tempoRelativo(iso: string): string {
  const data = new Date(iso)
  const seg = Math.round((data.getTime() - Date.now()) / 1000)
  if (Math.abs(seg) < 60) return "agora"
  const min = Math.round(seg / 60)
  if (Math.abs(min) < 60) return rtf.format(min, "minute")
  const hora = Math.round(min / 60)
  if (Math.abs(hora) < 24) return rtf.format(hora, "hour")
  const dia = Math.round(hora / 24)
  if (Math.abs(dia) < 7) return rtf.format(dia, "day")
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

export function dataCompleta(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR")
}

export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}
