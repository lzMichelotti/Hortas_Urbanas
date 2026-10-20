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

const LIMITE = 500
const registro: Medicao[] = []

export function registrarMedicao(m: Medicao): void {
  registro.push(m)
  if (registro.length > LIMITE) registro.shift()
}

export function medicoes(): readonly Medicao[] {
  return registro
}
