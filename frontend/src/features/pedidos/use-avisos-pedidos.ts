import { useEffect } from "react"
import { useNavigate } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Capacitor } from "@capacitor/core"
import { App } from "@capacitor/app"
import { LocalNotifications, type LocalNotificationSchema } from "@capacitor/local-notifications"
import { useMe } from "@/features/auth/use-me"
import { useMeuCanteiro } from "@/features/canteiro/use-meu-canteiro"
import { useCanteiros } from "@/features/canteiros/use-canteiros"
import { useSolicitacoesDoMembro } from "@/features/solicitacoes/use-solicitacoes"
import { useSolicitacoesLider } from "@/features/solicitacoes/use-solicitacoes-lider"
import { useDemandas, useDemandasDoMembro } from "@/features/demandas/use-demandas"
import { usePedidosAdmin } from "@/features/admin/use-painel-admin"
import { useNomeProduto } from "@/features/produtos/use-nome-produto"
import { garantirPermissao } from "@/features/ciclos/lembretes"
import {
  ORIGEM_ATRASOS,
  avisosDeRepasse,
  avisosDoLider,
  avisosDoMembro,
  planejarResumoAtrasos,
  type PedidoVisto,
  type Visto,
} from "./avisos"

const ROTA_MEMBRO = "/painel/comunidade"
const ROTA_LIDER = "/painel/solicitacoes"
const ROTA_ADMIN = "/painel/admin-demandas"

function lerVisto(chave: string): Visto | null {
  try {
    const bruto = localStorage.getItem(chave)
    return bruto ? (JSON.parse(bruto) as Visto) : null
  } catch {
    return null
  }
}

function gravarVisto(chave: string, visto: Visto) {
  try {
    localStorage.setItem(chave, JSON.stringify(visto))
  } catch {
    /* sem armazenamento: na próxima vez só memoriza de novo, sem avisar */
  }
}

async function avisarAgora(avisos: LocalNotificationSchema[]) {
  if (avisos.length && (await garantirPermissao())) await LocalNotifications.schedule({ notifications: avisos })
}

async function replanejarAtrasos(avisos: LocalNotificationSchema[]) {
  if (!(await garantirPermissao())) return
  const { notifications: pendentes } = await LocalNotifications.getPending()
  const antigos = pendentes.filter((n) => n.extra?.origem === ORIGEM_ATRASOS)
  if (antigos.length) await LocalNotifications.cancel({ notifications: antigos.map((n) => ({ id: n.id })) })
  if (avisos.length) await LocalNotifications.schedule({ notifications: avisos })
}

export function useAvisosPedidos() {
  const me = useMe()
  const nativo = Capacitor.isNativePlatform()
  const papel = nativo ? me.data?.privilegio : undefined
  const userId = me.data?.id

  const ehMembro = papel === "MEMBRO_CANTEIRO"
  const ehLider = papel === "LIDER_HORTA"
  const ehAdmin = papel === "ADMIN_SUPREMO"

  const canteiro = useMeuCanteiro(ehMembro)
  const plantasMembro = useSolicitacoesDoMembro(ehMembro ? canteiro.data?.id : undefined)
  const materiaisMembro = useDemandasDoMembro(ehMembro ? canteiro.data?.id : undefined)
  const plantasLider = useSolicitacoesLider(ehLider)
  const materiaisLider = useDemandas(ehLider)
  const canteiros = useCanteiros(ehLider)
  const pedidosAdmin = usePedidosAdmin(ehAdmin)
  const nomeProduto = useNomeProduto()

  const qc = useQueryClient()
  const navigate = useNavigate()

  // Sem refetch ao focar a janela (desligado no app para poupar dados): ao voltar para o
  // app, só as listas de pedidos do papel são buscadas de novo.
  useEffect(() => {
    if (!papel) return
    const chaves = ehMembro ? [["solicitacoes"], ["demandas-membro"]] : ehLider ? [["solicitacoes"], ["demandas"]] : [["admin-pedidos"]]
    const ouvinte = App.addListener("resume", () => {
      for (const queryKey of chaves) void qc.refetchQueries({ queryKey, type: "active" })
    })
    return () => void ouvinte.then((h) => h.remove())
  }, [papel, ehMembro, ehLider, qc])

  useEffect(() => {
    if (!nativo) return
    const ouvinte = LocalNotifications.addListener("localNotificationActionPerformed", ({ notification }) => {
      const rota = notification.extra?.rota
      if (typeof rota === "string") navigate(rota)
    })
    return () => void ouvinte.then((h) => h.remove())
  }, [nativo, navigate])

  useEffect(() => {
    const plantas = plantasMembro.data
    const materiais = materiaisMembro.data
    if (!ehMembro || userId == null || !plantas || !materiais) return
    const pedidos: PedidoVisto[] = [
      ...plantas.map((s) => ({ tipo: "PLANTA" as const, id: s.id, nome: nomeProduto(s.produto_id), status: s.status, previsao: s.previsao_entrega })),
      ...materiais.map((d) => ({ tipo: "MATERIAL" as const, id: d.id, nome: d.descricao, status: d.status, previsao: d.previsao_entrega })),
    ]
    const chave = `hu_avisos_membro_${userId}`
    const { avisos, visto } = avisosDoMembro(pedidos, lerVisto(chave), ROTA_MEMBRO)
    gravarVisto(chave, visto)
    void avisarAgora(avisos)
  }, [ehMembro, userId, plantasMembro.data, materiaisMembro.data, nomeProduto])

  useEffect(() => {
    if (!ehLider || userId == null || !plantasLider.data || !materiaisLider.data || !canteiros.data) return
    // Pedido do próprio canteiro do líder, ou feito por ele para a horta, não é novidade para ele.
    const meus = new Set(canteiros.data.filter((c) => c.usuario_id === userId).map((c) => c.id))
    const deOutros = (canteiroId: number | null | undefined) => canteiroId != null && !meus.has(canteiroId)
    const pedidos: PedidoVisto[] = [
      ...plantasLider.data.filter((s) => deOutros(s.canteiro_id)).map((s) => ({ tipo: "PLANTA" as const, id: s.id, nome: nomeProduto(s.produto_id), status: s.status })),
      ...materiaisLider.data.filter((d) => deOutros(d.canteiro_id)).map((d) => ({ tipo: "MATERIAL" as const, id: d.id, nome: d.descricao, status: d.status })),
    ]
    const chave = `hu_avisos_lider_${userId}`
    const { avisos, visto } = avisosDoLider(pedidos, lerVisto(chave), ROTA_LIDER)
    gravarVisto(chave, visto)
    void avisarAgora(avisos)
  }, [ehLider, userId, plantasLider.data, materiaisLider.data, canteiros.data, nomeProduto])

  useEffect(() => {
    if (!ehAdmin || userId == null || !pedidosAdmin.data) return
    const lista = pedidosAdmin.data
    const pedidos: PedidoVisto[] = lista.map((p) => ({
      tipo: p.tipo,
      id: p.id,
      nome: p.tipo === "PLANTA" ? nomeProduto(p.produto_id) : (p.descricao ?? "Material"),
      status: p.status,
      encaminhada: p.encaminhada,
    }))
    const chave = `hu_avisos_admin_${userId}`
    const { avisos, visto } = avisosDeRepasse(pedidos, lerVisto(chave), ROTA_ADMIN)
    gravarVisto(chave, visto)
    void avisarAgora(avisos)
    void replanejarAtrasos(planejarResumoAtrasos(lista, new Date(), ROTA_ADMIN))
  }, [ehAdmin, userId, pedidosAdmin.data, nomeProduto])
}
