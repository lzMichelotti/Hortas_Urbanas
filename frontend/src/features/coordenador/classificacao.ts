import type { ClasseSolo, EstadoSensor, Leitura, ModoEnergia, NoCoordenador, OrigemHora } from "./tipos"

// PROVISÓRIO: na Etapa 9 os limites passam para o coordenador, que manda a classe
// pronta (solo_classe); aí basta apagar o cálculo local de classeSolo.
// O nó envia a cada 15 min no campo: parado = mais de ~2,5 ciclos sem notícia.
export const LIMITES_PROVISORIOS = {
  soloSecoAbaixoPct: 25,
  soloMuitoUmidoAcimaPct: 90,
  paradoAposS: 40 * 60,
}

export function classeSolo(l: Leitura): ClasseSolo | null {
  if (l.solo_classe) return l.solo_classe
  if (l.estados.solo !== "ok" || l.solo_pct == null) return null
  if (l.solo_pct < LIMITES_PROVISORIOS.soloSecoAbaixoPct) return "seco"
  if (l.solo_pct > LIMITES_PROVISORIOS.soloMuitoUmidoAcimaPct) return "muito_umido"
  return "umido"
}

export const TEXTO_SOLO: Record<ClasseSolo, string> = {
  seco: "Solo seco",
  umido: "Solo úmido",
  muito_umido: "Solo muito úmido",
}

export function textoSolo(l: Leitura): string {
  const classe = classeSolo(l)
  if (classe) return TEXTO_SOLO[classe]
  if (l.estados.solo === "erro") return "Sem resposta"
  if (l.estados.solo === "fora_de_faixa") return "Leitura estranha"
  return "Falta calibrar"
}

export function valorOuProblema(valor: number | null, estado: EstadoSensor, formatar: (v: number) => string): string {
  if (estado === "erro" || valor == null) return "Sem resposta"
  if (estado === "fora_de_faixa") return "Leitura estranha"
  return formatar(valor)
}

const TEXTO_BATERIA: Record<ModoEnergia, string> = {
  normal: "Bateria ok",
  economia: "Bateria fraca",
  critico: "Trocar bateria",
}

// Sem o modo do nó na API não há classificação: nada de limite em mV no app.
export function textoBateria(no: NoCoordenador): string | null {
  return no.modo_energia ? TEXTO_BATERIA[no.modo_energia] : null
}

export function estaParado(no: NoCoordenador): boolean {
  return no.visto == null || no.visto.ha_s > LIMITES_PROVISORIOS.paradoAposS
}

export function textoVisto(no: NoCoordenador): string {
  if (no.visto == null) return "Sem notícia"
  const s = no.visto.ha_s
  if (s < 60) return "Visto agora há pouco"
  if (s < 3600) return `Visto há ${Math.floor(s / 60)} min`
  if (s < 86400) return `Visto há ${Math.floor(s / 3600)} h`
  return `Visto há ${Math.floor(s / 86400)} dias`
}

const HORA_LOCAL = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" })

export function textoHoraLeitura(hora: { utc: string | null; origem: OrigemHora }): string {
  if (hora.origem === "sem_hora" || hora.utc == null) return "hora desconhecida"
  const hhmm = HORA_LOCAL.format(new Date(hora.utc))
  return hora.origem === "reconstruida" ? `leitura das ${hhmm} (hora aproximada)` : `leitura das ${hhmm}`
}
