import { lerPagina, lerStatus } from "./api"
import { abrirBanco, concluir, esperar, LEITURAS, SINCRONIZACAO } from "./banco"
import type { LeituraHistorico } from "./tipos"

export interface LeituraGuardada extends Omit<LeituraHistorico, "hora"> {
  coordenador: string
  geracao: string
  utc: string | null
  origem: LeituraHistorico["hora"]["origem"]
  // Epoch em ms; ausente em leituras sem hora (ficam fora do índice por período).
  t?: number
  // 1 só nas leituras sem hora (o índice sem_hora_por_no conta quantas ficam fora dos gráficos).
  semHora?: 1
  // 0/1 e não boolean: IndexedDB não indexa booleanos. Usado pelo envio (10.7).
  enviado: 0 | 1
}

interface EstadoSincronizacao {
  coordenador: string
  geracao: string
  cursor: number | null
  atualizadoEm: string
}

export interface Progresso {
  baixadas: number
  // Estimativa pelo total do /status menos o que já está no celular desta geração.
  faltavam: number
}

function guardada(l: LeituraHistorico, coordenador: string, geracao: string): LeituraGuardada {
  const { hora, ...resto } = l
  const g: LeituraGuardada = { ...resto, coordenador, geracao, utc: hora.utc, origem: hora.origem, enviado: 0 }
  if (hora.origem !== "sem_hora" && hora.utc) g.t = Date.parse(hora.utc)
  else g.semHora = 1
  return g
}

async function contarGuardadas(db: IDBDatabase, coordenador: string, geracao: string): Promise<number> {
  const faixa = IDBKeyRange.bound([coordenador, geracao, -Infinity], [coordenador, geracao, Infinity])
  return esperar(db.transaction(LEITURAS).objectStore(LEITURAS).count(faixa))
}

// Página e cursor na MESMA transação: se a conexão cair no meio, ou os dois
// ficam gravados ou nenhum, e a próxima sincronização retoma sem pular nem repetir.
async function guardarPagina(db: IDBDatabase, leituras: LeituraGuardada[], estado: EstadoSincronizacao) {
  const tx = db.transaction([LEITURAS, SINCRONIZACAO], "readwrite")
  const loja = tx.objectStore(LEITURAS)
  for (const l of leituras) {
    // add (e não put): repetida não duplica e não zera a marca "enviado".
    const pedido = loja.add(l)
    pedido.onerror = (e) => {
      if (pedido.error?.name === "ConstraintError") e.preventDefault()
    }
  }
  tx.objectStore(SINCRONIZACAO).put(estado)
  await concluir(tx)
}

const TENTATIVAS_POR_PAGINA = 3

// Uma página lenta ou perdida não derruba a cópia inteira: tenta de novo antes de desistir.
async function lerPaginaComInsistencia(cursor: number | null) {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await lerPagina(cursor)
    } catch (e) {
      if (tentativa >= TENTATIVAS_POR_PAGINA) throw e
      await new Promise((r) => setTimeout(r, 2000 * tentativa))
    }
  }
}

async function sincronizarAgora(aoProgredir: (p: Progresso) => void): Promise<number> {
  const db = await abrirBanco()
  const status = await lerStatus()
  const { coordenador } = status
  const geracao = status.armazenamento.geracao
  if (!coordenador || !geracao) return 0

  const salvo = (await esperar(db.transaction(SINCRONIZACAO).objectStore(SINCRONIZACAO).get(coordenador))) as
    | EstadoSincronizacao
    | undefined
  // Geração nova = histórico formatado: o cursor antigo não vale mais.
  let cursor = salvo && salvo.geracao === geracao ? salvo.cursor : null

  const faltavam = Math.max(0, status.armazenamento.registros - (await contarGuardadas(db, coordenador, geracao)))
  let baixadas = 0
  aoProgredir({ baixadas, faltavam })

  for (;;) {
    const pagina = await lerPaginaComInsistencia(cursor)
    cursor = pagina.proximo_cursor ?? cursor
    await guardarPagina(
      db,
      pagina.leituras.map((l) => guardada(l, coordenador, geracao)),
      { coordenador, geracao, cursor, atualizadoEm: new Date().toISOString() },
    )
    baixadas += pagina.leituras.length
    aoProgredir({ baixadas, faltavam: Math.max(faltavam, baixadas) })
    if (pagina.fim) return baixadas
  }
}

let emAndamento: Promise<number> | null = null

// Uma sincronização por vez: o coordenador atende uma requisição por vez.
export function sincronizar(aoProgredir: (p: Progresso) => void): Promise<number> {
  emAndamento ??= sincronizarAgora(aoProgredir).finally(() => {
    emAndamento = null
  })
  return emAndamento
}
