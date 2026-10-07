import type { LocalNotificationSchema } from "@capacitor/local-notifications"
import { diaMes } from "./previsao"

// Aviso de pedido é notificação local, como o lembrete de colheita: o aparelho compara
// o que acabou de baixar com o que já tinha visto e avisa a diferença. Por isso só
// percebe a novidade quando o app é aberto ou volta para a tela.

export const ORIGEM_PEDIDO = "aviso-pedido"
export const ORIGEM_ATRASOS = "resumo-atrasos"

// Faixas de id longe das do lembrete de colheita (cicloId * 10 + n).
const ID_MEMBRO = 1_100_000_000
const ID_MATERIAL = 50_000_000
const ID_LIDER = 1_200_000_001
const ID_REPASSADO = 1_200_000_002
const ID_ATRASOS = 1_300_000_000

const DIAS_SEM_RESPOSTA = 2
const DIAS_RESUMO = 7
const HORA_AVISO = 9

export type Visto = Record<string, string>

export type PedidoVisto = {
  tipo: "PLANTA" | "MATERIAL"
  id: number
  nome: string
  status: string
  previsao?: string | null
  encaminhada?: boolean
}

const chave = (p: PedidoVisto) => `${p.tipo === "PLANTA" ? "P" : "M"}${p.id}`
const emAberto = (status: string) => status === "ABERTA" || status === "EM_ATENDIMENTO"

const estado = (pedidos: PedidoVisto[], valor: (p: PedidoVisto) => string): Visto =>
  Object.fromEntries(pedidos.map((p) => [chave(p), valor(p)]))

// Na primeira vez o aparelho só memoriza: avisar tudo que já existia viraria uma enxurrada.
type Resultado = { avisos: LocalNotificationSchema[]; visto: Visto }

export function avisosDoMembro(pedidos: PedidoVisto[], visto: Visto | null, rota: string): Resultado {
  const atual = estado(pedidos, (p) => p.status)
  if (visto == null) return { avisos: [], visto: atual }

  const avisos: LocalNotificationSchema[] = []
  for (const p of pedidos) {
    // Pedido que este aparelho nunca viu foi feito agora há pouco — estava "esperando".
    const antes = visto[chave(p)] ?? "ABERTA"
    if (antes === p.status) continue
    const id = ID_MEMBRO + (p.tipo === "MATERIAL" ? ID_MATERIAL : 0) + p.id
    if (p.status === "EM_ATENDIMENTO" && antes === "ABERTA") {
      avisos.push({
        id,
        title: "Seu pedido foi aprovado! ✅",
        body: p.previsao
          ? `${p.nome} foi aprovado. Deve chegar até ${diaMes(p.previsao)}.`
          : `${p.nome} foi aprovado. Logo chega para você!`,
        extra: { origem: ORIGEM_PEDIDO, rota },
      })
    } else if (p.status === "CANCELADA") {
      avisos.push({
        id,
        title: "Pedido não atendido",
        body: `Seu pedido de ${p.nome} não pôde ser atendido desta vez.`,
        extra: { origem: ORIGEM_PEDIDO, rota },
      })
    }
  }
  return { avisos, visto: atual }
}

function agrupado(id: number, novos: PedidoVisto[], titulo1: string, tituloN: string, rota: string) {
  if (novos.length === 0) return []
  const um = novos.length === 1
  return [
    {
      id,
      title: um ? titulo1 : tituloN.replace("{n}", String(novos.length)),
      body: um ? `${novos[0].nome}. Toque para ver.` : novos.map((p) => p.nome).join(", "),
      extra: { origem: ORIGEM_PEDIDO, rota },
    },
  ]
}

export function avisosDoLider(pedidos: PedidoVisto[], visto: Visto | null, rota: string): Resultado {
  const atual = estado(pedidos, () => "1")
  if (visto == null) return { avisos: [], visto: atual }
  const novos = pedidos.filter((p) => p.status === "ABERTA" && !(chave(p) in visto))
  return { avisos: agrupado(ID_LIDER, novos, "Novo pedido na horta 📦", "{n} novos pedidos na horta 📦", rota), visto: atual }
}

export function avisosDeRepasse(pedidos: PedidoVisto[], visto: Visto | null, rota: string): Resultado {
  const repassados = pedidos.filter((p) => p.encaminhada && emAberto(p.status))
  const atual = estado(repassados, () => "1")
  if (visto == null) return { avisos: [], visto: atual }
  const novos = repassados.filter((p) => !(chave(p) in visto))
  return {
    avisos: agrupado(ID_REPASSADO, novos, "Pedido repassado pelo líder 📨", "{n} pedidos repassados pelos líderes 📨", rota),
    visto: atual,
  }
}

export type PedidoComPrazo = { status: string; criado_em: string; previsao_entrega?: string | null; horta_id: number }

const isoDia = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Mesma regra do backend (atraso_do_pedido): esperando há DIAS_SEM_RESPOSTA dias, ou
// aprovado com a previsão já passada.
function atrasadoEm(p: PedidoComPrazo, quando: Date) {
  if (p.status === "ABERTA") {
    return new Date(p.criado_em).getTime() + DIAS_SEM_RESPOSTA * 86_400_000 <= quando.getTime()
  }
  return p.status === "EM_ATENDIMENTO" && p.previsao_entrega != null && p.previsao_entrega < isoDia(quando)
}

// Um resumo por dia, às 9h, dos próximos dias. Supõe que nada muda até lá; ao abrir o
// app tudo é replanejado, então um pedido respondido nesse meio-tempo some do resumo.
export function planejarResumoAtrasos(pedidos: PedidoComPrazo[], agora: Date, rota: string): LocalNotificationSchema[] {
  const out: LocalNotificationSchema[] = []
  for (let d = 0; d < DIAS_RESUMO; d++) {
    const quando = new Date(agora)
    quando.setDate(quando.getDate() + d)
    quando.setHours(HORA_AVISO, 0, 0, 0)
    if (quando <= agora) continue
    const atrasados = pedidos.filter((p) => atrasadoEm(p, quando))
    if (atrasados.length === 0) continue
    const hortas = new Set(atrasados.map((p) => p.horta_id)).size
    const n = atrasados.length
    out.push({
      id: ID_ATRASOS + d,
      title: "Pedidos atrasados ⏰",
      body: `Pode haver ${n} ${n === 1 ? "pedido atrasado" : "pedidos atrasados"} em ${hortas} ${hortas === 1 ? "horta" : "hortas"}. Toque para conferir.`,
      schedule: { at: quando, allowWhileIdle: true },
      extra: { origem: ORIGEM_ATRASOS, rota },
    })
  }
  return out
}
