import { Capacitor } from "@capacitor/core"
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from "@capacitor/local-notifications"
import type { components } from "@/lib/api/schema"
import { FRACAO_CRESCENDO } from "./crescimento"

type Ciclo = components["schemas"]["CicloRead"]
type NomeProduto = (id: number | null | undefined) => string

const ORIGEM = "lembrete-colheita"
const HORA_AVISO = 9

function as9h(d: Date): Date {
  const r = new Date(d)
  r.setHours(HORA_AVISO, 0, 0, 0)
  return r
}

function nomeDe(c: Ciclo, nomeProduto: NomeProduto): string {
  const bruto = nomeProduto(c.produto_id)
  return bruto === "—" || bruto.startsWith("#") ? "sua planta" : bruto
}

function planejar(ciclos: Ciclo[], nomeProduto: NomeProduto): LocalNotificationSchema[] {
  const agora = Date.now()
  const out: LocalNotificationSchema[] = []

  for (const c of ciclos) {
    if (!c.data_plantio || !c.previsao_colheita) continue
    if (c.status === "COLHIDO" || c.data_colheita_real) continue

    const ini = new Date(`${c.data_plantio}T00:00:00`).getTime()
    const fim = new Date(`${c.previsao_colheita}T00:00:00`).getTime()
    if (!(fim > ini)) continue

    const planta = nomeDe(c, nomeProduto)

    const crescendo = as9h(new Date(ini + FRACAO_CRESCENDO * (fim - ini)))
    if (crescendo.getTime() > agora) {
      const dias = Math.max(1, Math.ceil((fim - crescendo.getTime()) / 86400000))
      out.push({
        id: c.id * 10 + 1,
        title: `${planta} está crescendo 🌿`,
        body: `Faltam ${dias} dias para a colheita. Venha ver o andamento!`,
        schedule: { at: crescendo, allowWhileIdle: true },
        extra: { origem: ORIGEM, cicloId: c.id, marco: "crescendo" },
      })
    }

    const colher = as9h(new Date(`${c.previsao_colheita}T00:00:00`))
    if (colher.getTime() > agora) {
      out.push({
        id: c.id * 10 + 2,
        title: `Dia de colher ${planta}! 🧺`,
        body: "A previsão de colheita é hoje. Venha ver como ficou!",
        schedule: { at: colher, allowWhileIdle: true },
        extra: { origem: ORIGEM, cicloId: c.id, marco: "colher" },
      })
    }
  }

  return out
}

async function garantirPermissao(): Promise<boolean> {
  const atual = await LocalNotifications.checkPermissions()
  if (atual.display === "granted") return true
  if (atual.display === "denied") return false
  const novo = await LocalNotifications.requestPermissions()
  return novo.display === "granted"
}

export async function sincronizarLembretes(
  ciclos: Ciclo[],
  nomeProduto: NomeProduto,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  if (!(await garantirPermissao())) return

  const { notifications: pendentes } = await LocalNotifications.getPending()
  const meus = pendentes.filter((n) => n.extra?.origem === ORIGEM)
  if (meus.length) {
    await LocalNotifications.cancel({ notifications: meus.map((n) => ({ id: n.id })) })
  }

  const novos = planejar(ciclos, nomeProduto)
  if (novos.length) await LocalNotifications.schedule({ notifications: novos })
}
