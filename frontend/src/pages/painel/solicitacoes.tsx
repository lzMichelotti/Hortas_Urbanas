import { useState } from "react"
import { Tabs } from "radix-ui"
import { Check, X } from "lucide-react"
import { useSolicitacoesLider, useResponderSolicitacao } from "@/features/solicitacoes/use-solicitacoes-lider"
import { useDemandas, useAtualizarStatusDemanda } from "@/features/demandas/use-demandas"
import { useCanteiros } from "@/features/canteiros/use-canteiros"
import { useMe } from "@/features/auth/use-me"
import { useNomeProduto } from "@/features/produtos/use-nome-produto"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import type { components } from "@/lib/api/schema"
import { Aviso, Carregando } from "@/components/feedback"

type StatusSolicitacao = components["schemas"]["StatusSolicitacao"]
type StatusDemanda = components["schemas"]["StatusDemanda"]

const STATUS_SOLICITACAO: Record<StatusSolicitacao, { rotulo: string; cor: string }> = {
  PENDENTE: { rotulo: "Aguardando", cor: "bg-amber-400 text-black" },
  APROVADA: { rotulo: "Aprovada ✓", cor: "bg-hu-bright text-hu-bg" },
  RECUSADA: { rotulo: "Recusada", cor: "bg-red-500 text-white" },
}

const STATUS_MATERIAL: Record<StatusDemanda, { rotulo: string; cor: string }> = {
  ABERTA: { rotulo: "Aguardando", cor: "bg-amber-400 text-black" },
  EM_ATENDIMENTO: { rotulo: "Providenciando", cor: "bg-hu-bright text-hu-bg" },
  ATENDIDA: { rotulo: "Entregue ✓", cor: "bg-white text-hu-bg" },
  CANCELADA: { rotulo: "Recusado", cor: "bg-red-500 text-white" },
}

const fmt = (d: string) => d.split("-").reverse().join("/")

const ABA_CLASSE =
  "flex h-12 items-center justify-center rounded-xl border-2 border-hu-soft font-bold text-hu-text hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright data-[state=active]:border-hu-bright data-[state=active]:bg-hu-bright data-[state=active]:text-hu-bg"

export function SolicitacoesPage() {
  const me = useMe()
  const solicitacoes = useSolicitacoesLider()
  const canteiros = useCanteiros()
  const nomeProduto = useNomeProduto()
  const responder = useResponderSolicitacao()
  const demandas = useDemandas()
  const responderMaterial = useAtualizarStatusDemanda(me.data?.horta_id ?? 0)

  const [aba, setAba] = useState<"plantas" | "materiais">("plantas")

  const nomeCanteiroMap = new Map(
    (canteiros.data ?? []).map((c) => [c.id, c.identificacao]),
  )
  const nomeCanteiro = (id: number | null | undefined) =>
    id == null ? "Canteiro" : nomeCanteiroMap.get(id) ?? `Canteiro #${id}`

  if (solicitacoes.isPending || canteiros.isPending) {
    return <Carregando />
  }

  const pendentes = (solicitacoes.data ?? []).filter((s) => s.status === "PENDENTE")
  const respondidas = (solicitacoes.data ?? []).filter((s) => s.status !== "PENDENTE")

  const materiais = (demandas.data ?? []).filter((d) => d.canteiro_id != null)
  const materiaisPendentes = materiais.filter((m) => m.status === "ABERTA" || m.status === "EM_ATENDIMENTO")
  const materiaisRespondidos = materiais.filter((m) => m.status === "ATENDIDA" || m.status === "CANCELADA")

  return (
    <div className="mx-auto max-w-2xl">
      <Voltar />
      <h1 className="mt-4 font-pixel text-sm text-hu-bright">Solicitações</h1>

      <Tabs.Root value={aba} onValueChange={(v) => setAba(v as "plantas" | "materiais")}>
        <Tabs.List className="mt-4 grid grid-cols-2 gap-2">
          <Tabs.Trigger value="plantas" className={ABA_CLASSE}>
            Plantas
            {pendentes.length > 0 && <span className="ml-2 rounded-full bg-amber-400 px-2 text-xs text-black">{pendentes.length}</span>}
          </Tabs.Trigger>
          <Tabs.Trigger value="materiais" className={ABA_CLASSE}>
            Materiais
            {materiaisPendentes.filter((m) => m.status === "ABERTA").length > 0 && (
              <span className="ml-2 rounded-full bg-amber-400 px-2 text-xs text-black">
                {materiaisPendentes.filter((m) => m.status === "ABERTA").length}
              </span>
            )}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="plantas">
        <>
          {(solicitacoes.data ?? []).length === 0 && (
            <p className="mt-6 rounded-2xl border-4 border-hu-bright bg-hu-panel p-8 text-center text-hu-text">
              Nenhum pedido de planta recebido ainda.
            </p>
          )}

          {pendentes.length > 0 && (
            <section className="mt-5">
              <p className="mb-3 font-pixel text-xs text-amber-400">
                {pendentes.length} aguardando resposta
              </p>
              <ul className="flex flex-col gap-3">
                {pendentes.map((s) => {
                  const respondendoEste = responder.isPending && responder.variables?.id === s.id
                  return (
                    <li
                      key={s.id}
                      className="rounded-2xl border-4 border-amber-400/60 bg-hu-panel p-4 text-hu-text"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold">{nomeProduto(s.produto_id)} · {s.quantidade} mudas</p>
                          <p className="mt-0.5 text-sm text-hu-muted">
                            {nomeCanteiro(s.canteiro_id)}
                            {s.data_desejada_plantio
                              ? ` · para ${fmt(s.data_desejada_plantio)}`
                              : ""}
                          </p>
                          {s.justificativa && (
                            <p className="mt-1 text-sm text-hu-muted italic">
                              "{s.justificativa}"
                            </p>
                          )}
                        </div>
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${STATUS_SOLICITACAO[s.status].cor}`}>
                          {STATUS_SOLICITACAO[s.status].rotulo}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => responder.mutate({ id: s.id, status: "APROVADA" })}
                          disabled={responder.isPending}
                          className="flex items-center gap-1.5 rounded-lg bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
                        >
                          <Check className="size-4" aria-hidden />
                          {respondendoEste && responder.variables?.status === "APROVADA"
                            ? "Aprovando…"
                            : "Aprovar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => responder.mutate({ id: s.id, status: "RECUSADA" })}
                          disabled={responder.isPending}
                          className="flex items-center gap-1.5 rounded-lg border-red-400/50 bg-transparent text-red-600 hover:bg-red-500/15"
                        >
                          <X className="size-4" aria-hidden />
                          {respondendoEste && responder.variables?.status === "RECUSADA"
                            ? "Recusando…"
                            : "Recusar"}
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {responder.isError && (
            <Aviso variante="erro" className="mt-4">
              {responder.error.message}
            </Aviso>
          )}

          {respondidas.length > 0 && (
            <section className="mt-6">
              <p className="mb-3 font-pixel text-xs text-hu-muted">Respondidos</p>
              <ul className="flex flex-col gap-3">
                {respondidas.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border-4 border-hu-soft bg-hu-panel p-4 text-hu-text opacity-75"
                  >
                    <div className="min-w-0">
                      <p className="font-bold">{nomeProduto(s.produto_id)} · {s.quantidade} mudas</p>
                      <p className="mt-0.5 text-sm text-hu-muted">
                        {nomeCanteiro(s.canteiro_id)}
                        {s.data_desejada_plantio
                          ? ` · para ${fmt(s.data_desejada_plantio)}`
                          : ""}
                      </p>
                      {s.justificativa && (
                        <p className="mt-1 text-sm text-hu-muted italic">
                          "{s.justificativa}"
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${STATUS_SOLICITACAO[s.status].cor}`}>
                      {STATUS_SOLICITACAO[s.status].rotulo}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
        </Tabs.Content>

        <Tabs.Content value="materiais">
        <>
          {demandas.isPending && <Carregando className="mt-6" />}

          {!demandas.isPending && materiais.length === 0 && (
            <p className="mt-6 rounded-2xl border-4 border-hu-bright bg-hu-panel p-8 text-center text-hu-text">
              Nenhum pedido de material recebido ainda.
            </p>
          )}

          {materiaisPendentes.length > 0 && (
            <section className="mt-5">
              <ul className="flex flex-col gap-3">
                {materiaisPendentes.map((m) => {
                  const respondendoEste = responderMaterial.isPending && responderMaterial.variables?.demandaId === m.id
                  return (
                    <li
                      key={m.id}
                      className={`rounded-2xl border-4 bg-hu-panel p-4 text-hu-text ${
                        m.status === "ABERTA" ? "border-amber-400/60" : "border-hu-bright"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold">{m.descricao}</p>
                          <p className="mt-0.5 text-sm text-hu-muted">
                            {nomeCanteiro(m.canteiro_id)} · {m.tipo_demanda} · {m.quantidade} {m.unidade_medida}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${STATUS_MATERIAL[m.status].cor}`}>
                          {STATUS_MATERIAL[m.status].rotulo}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        {m.status === "ABERTA" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => responderMaterial.mutate({ demandaId: m.id, status: "EM_ATENDIMENTO" })}
                              disabled={responderMaterial.isPending}
                              className="flex items-center gap-1.5 rounded-lg bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
                            >
                              <Check className="size-4" aria-hidden />
                              {respondendoEste && responderMaterial.variables?.status === "EM_ATENDIMENTO"
                                ? "Aceitando…"
                                : "Aceitar"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => responderMaterial.mutate({ demandaId: m.id, status: "CANCELADA" })}
                              disabled={responderMaterial.isPending}
                              className="flex items-center gap-1.5 rounded-lg border-red-400/50 bg-transparent text-red-600 hover:bg-red-500/15"
                            >
                              <X className="size-4" aria-hidden />
                              {respondendoEste && responderMaterial.variables?.status === "CANCELADA"
                                ? "Recusando…"
                                : "Recusar"}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => responderMaterial.mutate({ demandaId: m.id, status: "ATENDIDA" })}
                            disabled={responderMaterial.isPending}
                            className="flex items-center gap-1.5 rounded-lg bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
                          >
                            <Check className="size-4" aria-hidden />
                            {respondendoEste ? "Salvando…" : "Marcar como entregue"}
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {responderMaterial.isError && (
            <Aviso variante="erro" className="mt-4">
              {responderMaterial.error.message}
            </Aviso>
          )}

          {materiaisRespondidos.length > 0 && (
            <section className="mt-6">
              <p className="mb-3 font-pixel text-xs text-hu-muted">Respondidos</p>
              <ul className="flex flex-col gap-3">
                {materiaisRespondidos.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border-4 border-hu-soft bg-hu-panel p-4 text-hu-text opacity-75"
                  >
                    <div className="min-w-0">
                      <p className="font-bold">{m.descricao}</p>
                      <p className="mt-0.5 text-sm text-hu-muted">
                        {nomeCanteiro(m.canteiro_id)} · {m.tipo_demanda} · {m.quantidade} {m.unidade_medida}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${STATUS_MATERIAL[m.status].cor}`}>
                      {STATUS_MATERIAL[m.status].rotulo}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
