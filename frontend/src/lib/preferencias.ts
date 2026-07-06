export type Tema = "claro" | "escuro" | "auto"
export type Texto = "normal" | "grande"

const TEMA_KEY = "hu-tema"
const TEXTO_KEY = "hu-texto"

const LAT = -29.6842
const LON = -53.8069
const RAD = Math.PI / 180

const html = () => document.documentElement

function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

function gravar(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor)
  } catch {
    /* modo privado: só não persiste */
  }
}

function solDoDia(quando: number): { nascer: number; por: number } | null {
  const j = quando / 86400000 + 2440587.5
  const n = Math.round(j - 2451545 + 0.0008)
  const jStar = n - LON / 360
  const m = (357.5291 + 0.98560028 * jStar) % 360
  const c = 1.9148 * Math.sin(m * RAD) + 0.02 * Math.sin(2 * m * RAD) + 0.0003 * Math.sin(3 * m * RAD)
  const lambda = (m + c + 282.9372) % 360
  const jTransit = 2451545 + jStar + 0.0053 * Math.sin(m * RAD) - 0.0069 * Math.sin(2 * lambda * RAD)
  const delta = Math.asin(Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD))
  const cosW = (Math.sin(-0.833 * RAD) - Math.sin(LAT * RAD) * Math.sin(delta)) / (Math.cos(LAT * RAD) * Math.cos(delta))
  if (cosW < -1 || cosW > 1) return null
  const w = Math.acos(cosW) / RAD
  const ms = (jt: number) => (jt - 2440587.5) * 86400000
  return { nascer: ms(jTransit - w / 360), por: ms(jTransit + w / 360) }
}

function ehNoite(agora = Date.now()): boolean {
  const s = solDoDia(agora)
  if (!s) return false
  return agora < s.nascer || agora >= s.por
}

function aplicarTema(t: Tema) {
  html().classList.toggle("dark", t === "escuro" || (t === "auto" && ehNoite()))
}

function aplicarTexto(t: Texto) {
  html().classList.toggle("texto-grande", t === "grande")
}

let timer: ReturnType<typeof setTimeout> | undefined

function reagendarAuto() {
  if (timer) clearTimeout(timer)
  if (getTema() !== "auto") return
  const agora = Date.now()
  const s = solDoDia(agora)
  let proximo = agora + 3600000
  if (s) {
    const futuras = [s.nascer, s.por].filter((t) => t > agora)
    if (futuras.length) proximo = Math.min(...futuras)
    else {
      const amanha = solDoDia(agora + 86400000)
      if (amanha) proximo = amanha.nascer
    }
  }
  const atraso = Math.min(Math.max(proximo - agora + 1000, 60000), 6 * 3600000)
  timer = setTimeout(() => {
    aplicarTema("auto")
    reagendarAuto()
  }, atraso)
}

export function getTema(): Tema {
  const v = ler(TEMA_KEY)
  return v === "claro" || v === "escuro" || v === "auto" ? v : "auto"
}

export function getTexto(): Texto {
  return ler(TEXTO_KEY) === "grande" ? "grande" : "normal"
}

export function setTema(t: Tema) {
  gravar(TEMA_KEY, t)
  aplicarTema(t)
  reagendarAuto()
}

export function setTexto(t: Texto) {
  gravar(TEXTO_KEY, t)
  aplicarTexto(t)
}

export function aplicarPreferencias() {
  aplicarTema(getTema())
  aplicarTexto(getTexto())
  reagendarAuto()
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && getTema() === "auto") {
      aplicarTema("auto")
      reagendarAuto()
    }
  })
}
