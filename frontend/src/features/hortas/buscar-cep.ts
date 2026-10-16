import { digitos } from "@/lib/br"

export type EnderecoCep = { rua: string; bairro: string; cidade: string; uf: string }

const TIMEOUT_MS = 6_000

// ViaCEP escolhido por cobrir a periferia e os distritos rurais de Santa Maria
// com nomes de rua atuais (comparado com BrasilAPI, OpenCEP e AwesomeAPI).
// Doc: https://viacep.com.br/ — CEP inexistente volta 200 com {"erro": "true"}.
export async function buscarCep(cep: string): Promise<EnderecoCep | null> {
  const res = await fetch(`https://viacep.com.br/ws/${digitos(cep)}/json/`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) return null
  const d = await res.json()
  if (d.erro) return null
  return { rua: d.logradouro ?? "", bairro: d.bairro ?? "", cidade: d.localidade ?? "", uf: d.uf ?? "" }
}
