import { registrarMedicao } from "./medicoes"
import { Coordenador } from "./plugin"
import type { Alerta, ErroApiCoordenador, NoCoordenador, PaginaLeituras, StatusCoordenador } from "./tipos"

const BASE = import.meta.env.VITE_COORDENADOR_URL

export type TipoErroCoordenador = "sem_wifi" | "sem_resposta" | "resposta_invalida" | "recusado"

const MENSAGENS: Record<TipoErroCoordenador, string> = {
  sem_wifi: "Conecte-se ao Wi-Fi da horta.",
  sem_resposta: "Os sensores da horta não responderam. Confira se você está no Wi-Fi da horta.",
  resposta_invalida: "Os sensores da horta mandaram uma resposta estranha. Tente de novo.",
  recusado: "Os sensores da horta não aceitaram o pedido.",
}

export class ErroCoordenador extends Error {
  readonly tipo: TipoErroCoordenador
  readonly status: number
  readonly codigo?: string
  constructor(tipo: TipoErroCoordenador, status = 0, codigo?: string) {
    super(MENSAGENS[tipo])
    this.name = "ErroCoordenador"
    this.tipo = tipo
    this.status = status
    this.codigo = codigo
  }
}

async function pedir<T>(rota: string, metodo = "GET", corpo?: unknown, esperaMs?: number): Promise<T> {
  const inicio = performance.now()
  const medir = (status: number, msNativo: number | null, bytes: number) =>
    registrarMedicao({
      em: new Date().toISOString(),
      metodo,
      rota,
      status,
      msNativo,
      msTotal: Math.round(performance.now() - inicio),
      bytes,
    })

  let resposta
  try {
    resposta = await Coordenador.requisitar({
      url: `${BASE}/api/v1${rota}`,
      metodo,
      corpo: corpo === undefined ? undefined : JSON.stringify(corpo),
      esperaMs,
    })
  } catch (e) {
    const { code, data } = (e ?? {}) as { code?: unknown; data?: { duracaoMs?: unknown } }
    medir(0, typeof data?.duracaoMs === "number" ? data.duracaoMs : null, 0)
    throw new ErroCoordenador(code === "SEM_REDE" ? "sem_wifi" : "sem_resposta")
  }
  medir(resposta.status, resposta.duracaoMs, resposta.corpo.length)

  let json: unknown
  try {
    json = JSON.parse(resposta.corpo)
  } catch {
    throw new ErroCoordenador("resposta_invalida", resposta.status)
  }
  if (resposta.status >= 400) {
    const codigo = (json as Partial<ErroApiCoordenador>).erro?.codigo
    throw new ErroCoordenador("recusado", resposta.status, codigo)
  }
  return json as T
}

export const lerStatus = () => pedir<StatusCoordenador>("/status")
export const lerNos = () => pedir<{ nos: NoCoordenador[] }>("/nos").then((r) => r.nos)
// Página de 100: as de 200 fizeram o nó perder confirmações na bancada.
// Prazo de 30 s: no teste com a placa real, páginas oscilaram de 0,5 a 15 s.
export const lerPagina = (cursor: number | null) =>
  pedir<PaginaLeituras>(`/leituras?ordem=asc&limite=100${cursor == null ? "" : `&cursor=${cursor}`}`, "GET", undefined, 30_000)
export const lerAlertas = () => pedir<{ alertas: Alerta[] }>("/alertas").then((r) => r.alertas)
