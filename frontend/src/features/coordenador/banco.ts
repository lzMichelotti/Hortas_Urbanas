// IndexedDB nativo, sem biblioteca. Os dados pertencem à origem do site
// carregado pelo WebView, e o WebView recusa navigator.storage.persist():
// o Android pode apagá-los se faltar espaço. O coordenador guarda ~137 dias
// e a 10.7 manda tudo ao backend, então uma perda aqui é recuperável.

const NOME = "hortas-coordenador"

export const LEITURAS = "leituras"
export const SINCRONIZACAO = "sincronizacao"
export const MEDICOES = "medicoes"

// Cada posição sobe o esquema de i para i + 1; nunca editar uma que já foi publicada.
const MIGRACOES: ((db: IDBDatabase) => void)[] = [
  (db) => {
    // Chave (coordenador, geracao, id): o id global recomeça quando o histórico
    // é formatado, e a geração muda junto (docs/api-coordenador.md, 2.4.1).
    const leituras = db.createObjectStore(LEITURAS, { keyPath: ["coordenador", "geracao", "id"] })
    // "t" só existe em leituras com hora; as "sem_hora" ficam fora do índice
    // e, como na API, nunca entram num filtro por período.
    leituras.createIndex("por_no_e_hora", ["mac", "t"])
    leituras.createIndex("sem_hora_por_no", ["mac", "semHora"])
    leituras.createIndex("por_envio", "enviado")
    db.createObjectStore(SINCRONIZACAO, { keyPath: "coordenador" })
    db.createObjectStore(MEDICOES, { autoIncrement: true })
  },
]

let aberto: Promise<IDBDatabase> | null = null

export function abrirBanco(): Promise<IDBDatabase> {
  aberto ??= new Promise((resolve, reject) => {
    const pedido = indexedDB.open(NOME, MIGRACOES.length)
    pedido.onupgradeneeded = (e) => {
      for (let v = e.oldVersion; v < MIGRACOES.length; v++) MIGRACOES[v](pedido.result)
    }
    pedido.onsuccess = () => resolve(pedido.result)
    pedido.onerror = () => {
      aberto = null
      reject(pedido.error)
    }
  })
  return aberto
}

export function esperar<T>(pedido: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    pedido.onsuccess = () => resolve(pedido.result)
    pedido.onerror = () => reject(pedido.error)
  })
}

export function concluir(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}
