import { abrirBanco, esperar, LEITURAS } from "./banco"
import type { LeituraGuardada } from "./sincronizacao"

export interface NoGuardado {
  mac: string
  nome: string
}

// Lista os nós pulando de um MAC para o seguinte no índice (sem ler as leituras).
export async function nosGuardados(): Promise<NoGuardado[]> {
  const db = await abrirBanco()
  const indice = db.transaction(LEITURAS).objectStore(LEITURAS).index("por_no_e_hora")
  const nos: NoGuardado[] = []
  await new Promise<void>((resolve, reject) => {
    const pedido = indice.openCursor()
    pedido.onerror = () => reject(pedido.error)
    pedido.onsuccess = () => {
      const c = pedido.result
      if (!c) return resolve()
      const l = c.value as LeituraGuardada
      nos.push({ mac: l.mac, nome: l.nome })
      c.continue([l.mac, Infinity])
    }
  })
  return nos
}

export async function leiturasDoPeriodo(mac: string, desdeMs: number, ateMs: number): Promise<LeituraGuardada[]> {
  const db = await abrirBanco()
  const indice = db.transaction(LEITURAS).objectStore(LEITURAS).index("por_no_e_hora")
  return esperar(indice.getAll(IDBKeyRange.bound([mac, desdeMs], [mac, ateMs]))) as Promise<LeituraGuardada[]>
}

export async function contarSemHora(mac: string): Promise<number> {
  const db = await abrirBanco()
  const indice = db.transaction(LEITURAS).objectStore(LEITURAS).index("sem_hora_por_no")
  return esperar(indice.count(IDBKeyRange.only([mac, 1])))
}

export async function totalGuardadas(): Promise<number> {
  const db = await abrirBanco()
  return esperar(db.transaction(LEITURAS).objectStore(LEITURAS).count())
}

export interface Ponto {
  t: number
  v: number
}

// Média por intervalo: o gráfico nunca desenha milhares de pontos num celular fraco.
export function mediaPorIntervalo(
  leituras: LeituraGuardada[],
  valor: (l: LeituraGuardada) => number | null,
  intervaloMs: number,
): Ponto[] {
  const somas = new Map<number, { soma: number; n: number }>()
  for (const l of leituras) {
    const v = valor(l)
    if (v == null || l.t == null) continue
    const balde = Math.floor(l.t / intervaloMs) * intervaloMs
    const s = somas.get(balde) ?? { soma: 0, n: 0 }
    s.soma += v
    s.n++
    somas.set(balde, s)
  }
  return [...somas.entries()].sort((a, b) => a[0] - b[0]).map(([t, s]) => ({ t: t + intervaloMs / 2, v: s.soma / s.n }))
}
