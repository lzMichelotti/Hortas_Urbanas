import { abrirBanco, esperar, MEDICOES } from "./banco"

// Tempo de cada requisição ao coordenador: métrica da avaliação do TCC (10.6).
// msNativo = conexão + resposta medidas no Java; msTotal inclui a ponte do Capacitor.
export interface Medicao {
  em: string
  metodo: string
  rota: string
  status: number
  msNativo: number | null
  msTotal: number
  bytes: number
}

export function registrarMedicao(m: Medicao): void {
  // Sem await: a medição nunca atrasa nem derruba a requisição medida.
  void abrirBanco()
    .then((db) => db.transaction(MEDICOES, "readwrite").objectStore(MEDICOES).add(m))
    .catch(() => {})
}

export async function medicoesEmCsv(): Promise<string> {
  const db = await abrirBanco()
  const todas = (await esperar(db.transaction(MEDICOES).objectStore(MEDICOES).getAll())) as Medicao[]
  const linhas = todas.map((m) =>
    [m.em, m.metodo, `"${m.rota}"`, m.status, m.msNativo ?? "", m.msTotal, m.bytes].join(","),
  )
  return ["em,metodo,rota,status,ms_nativo,ms_total,bytes", ...linhas].join("\n")
}
