import { useState } from "react"
import { Tabs } from "radix-ui"
import { Check, X } from "lucide-react"
import { useSolicitacoesLider, useResponderSolicitacao } from "@/features/solicitacoes/use-solicitacoes-lider"
import { useDemandas, useAtualizarStatusDemanda } from "@/features/demandas/use-demandas"
import { useCanteiros } from "@/features/canteiros/use-canteiros"
import { useUsuarios } from "@/features/usuarios/use-usuarios"
import { useMe } from "@/features/auth/use-me"
import { useNomeProduto } from "@/features/produtos/use-nome-produto"
import { spriteProduto } from "@/features/produtos/sprites"
import { Voltar } from "@/components/voltar"
import { dataBR as fmt } from "@/features/ciclos/status"
import { Button } from "@/components/ui/button"
import type { components } from "@/lib/api/schema"
import { Aviso, Carregando, EstadoVazio } from "@/components/feedback"
import { ConfirmacaoInline } from "@/components/confirmar"
import { DivisorCerca } from "@/components/divisor-cerca"

type StatusSolicitacao = components["schemas"]["StatusSolicitacao"]
type StatusDemanda = components["schemas"]["StatusDemanda"]

const STATUS_SOLICITACAO: Record<StatusSolicitacao, { rotulo: string; chip: string }> = {
  PENDENTE: {
    rotulo: "Aguardando",
    chip: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  },
  APROVADA: {
    rotulo: "Aprovada ✓",
    chip: "border-green-300 bg-green-100 text-green-800 dark:border-green-500/40 dark:bg-green-500/15 dark:text-green-200",
  },
  RECUSADA: {
    rotulo: "Recusada",
    chip: "border-red-300 bg-red-100 text-red-800 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200",
  },
}

const STATUS_MATERIAL: Record<StatusDemanda, { rotulo: string; chip: string }> = {
  ABERTA: {
    rotulo: "Aguardando",
    chip: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  },
  EM_ATENDIMENTO: {
    rotulo: "Providenciando",
    chip: "border-green-300 bg-green-100 text-green-800 dark:border-green-500/40 dark:bg-green-500/15 dark:text-green-200",
  },
  ATENDIDA: {
    rotulo: "Entregue ✓",
    chip: "border-hu-soft bg-hu-soft/20 text-hu-text",
  },
  CANCELADA: {
    rotulo: "Recusado",
    chip: "border-red-300 bg-red-100 text-red-800 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200",
  },
}


const ABA_CLASSE =
  "flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-[#5b3a1a] bg-hu-panel font-bold text-hu-text shadow-[0_3px_0_#5b3a1a] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright data-[state=inactive]:hover:-translate-y-0.5 data-[state=active]:translate-y-0.5 data-[state=active]:bg-hu-bright data-[state=active]:text-hu-bg data-[state=active]:shadow-[0_1px_0_#5b3a1a]"

const BOTAO_PIXEL =
  "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[#5b3a1a] bg-hu-bright font-bold text-hu-bg shadow-[0_3px_0_#5b3a1a] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_#5b3a1a] disabled:pointer-events-none disabled:opacity-50"
const BOTAO_OUTLINE_VERMELHO =
  "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-red-400/50 bg-transparent text-red-600 hover:bg-red-500/15 disabled:pointer-events-none disabled:opacity-50"
const CHIP_QUANTIDADE =
  "mt-2 inline-flex w-fit items-center rounded-full border border-hu-soft bg-hu-soft/20 px-2.5 py-1 text-xs font-medium text-hu-text"

export function SolicitacoesPage() {
  const me = useMe()
  const solicitacoes = useSolicitacoesLider()
  const canteiros = useCanteiros()
  const usuarios = useUsuarios()
  const nomeProduto = useNomeProduto()
  const responder = useResponderSolicitacao()
  const demandas = useDemandas()
  const responderMaterial = useAtualizarStatusDemanda(me.data?.horta_id ?? 0)

  const [aba, setAba] = useState<"plantas" | "materiais">("plantas")
  const [confirmarRecusarId, setConfirmarRecusarId] = useState<number | null>(null)
  const [confirmarRecusarMaterialId, setConfirmarRecusarMaterialId] = useState<number | null>(null)

  const nomeCanteiroMap = new Map(
    (canteiros.data ?? []).map((c) => [c.id, c.identificacao]),
  )
  const nomeCanteiro = (id: number | null | undefined) =>
    id == null ? "Canteiro" : nomeCanteiroMap.get(id) ?? `Canteiro #${id}`

  // Melhoria progressiva: cruza canteiro→responsável via useUsuarios(), já
  // cacheada por outras telas. Se a query ainda não voltou (ou falhar), o mapa
  // fica vazio e a linha de contexto só mostra o canteiro — nunca bloqueia.
  const canteiroPorId = new Map((canteiros.data ?? []).map((c) => [c.id, c]))
  const usuarioPorId = new Map((usuarios.data ?? []).map((u) => [u.id, u]))
  const contextoCanteiro = (id: number | null | undefined) => {
    if (id == null) return "Canteiro"
    const c = canteiroPorId.get(id)
    if (!c) return `Canteiro #${id}`
    const responsavel = c.usuario_id != null ? usuarioPorId.get(c.usuario_id)?.nome : undefined
    return responsavel ? `${c.identificacao} · ${responsavel}` : c.identificacao
  }

  function toggleRecusar(id: number) {
    setConfirmarRecusarId((atual) => (atual === id ? null : id))
  }

  function toggleRecusarMaterial(id: number) {
    setConfirmarRecusarMaterialId((atual) => (atual === id ? null : id))
  }

  if (solicitacoes.isPending || canteiros.isPending) {
    return <Carregando />
  }

  const pendentes = (solicitacoes.data ?? []).filter((s) => s.status === "PENDENTE")
  const respondidas = (solicitacoes.data ?? []).filter((s) => s.status !== "PENDENTE")

  const materiais = (demandas.data ?? []).filter((d) => d.canteiro_id != null)
  const materiaisPendentes = materiais.filter((m) => m.status === "ABERTA" || m.status === "EM_ATENDIMENTO")
  const materiaisRespondidos = materiais.filter((m) => m.status === "ATENDIDA" || m.status === "CANCELADA")

  return (
    <div className="mx-auto max-w-2xl pb-4">
      <Voltar />
      <h1 className="mt-4 font-pixel text-sm text-hu-bright">Solicitações</h1>

      <Tabs.Root value={aba} onValueChange={(v) => setAba(v as "plantas" | "materiais")}>
        <Tabs.List className="mt-4 grid grid-cols-2 gap-2">
          <Tabs.Trigger value="plantas" className={ABA_CLASSE}>
            Plantas
            {pendentes.length > 0 && <span className="rounded-full bg-amber-400 px-2 text-xs text-black">{pendentes.length}</span>}
          </Tabs.Trigger>
          <Tabs.Trigger value="materiais" className={ABA_CLASSE}>
            Materiais
            {materiaisPendentes.filter((m) => m.status === "ABERTA").length > 0 && (
              <span className="rounded-full bg-amber-400 px-2 text-xs text-black">
                {materiaisPendentes.filter((m) => m.status === "ABERTA").length}
              </span>
            )}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="plantas">
          {(solicitacoes.data ?? []).length === 0 && (
            <EstadoVazio ilustracao="/personagem-idoso.webp">
              Nenhum pedido de planta recebido ainda.
            </EstadoVazio>
          )}

          {pendentes.length > 0 && (
            <section className="mt-5">
              <p className="mb-3 font-pixel text-xs text-amber-400">
                {pendentes.length} aguardando resposta
              </p>
              <ul className="flex flex-col gap-3">
                {pendentes.map((s) => {
                  const respondendoEste = responder.isPending && responder.variables?.id === s.id
                  const recusandoEste = respondendoEste && responder.variables?.status === "RECUSADA"
                  const sprite = spriteProduto(nomeProduto(s.produto_id))
                  return (
                    <li
                      key={s.id}
                      className="rounded-2xl border-2 border-amber-400/60 bg-hu-panel p-4 text-hu-text"
                    >
                      <div className="flex items-start gap-3">
                        {sprite && (
                          <img
                            src={sprite}
                            alt=""
                            width={44}
                            height={44}
                            className="size-11 shrink-0 [image-rendering:pixelated]"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">
                            {nomeProduto(s.produto_id)} · {s.quantidade} muda{s.quantidade > 1 ? "s" : ""}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-hu-muted">
                            {contextoCanteiro(s.canteiro_id)}
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
                      </div>

                      <div className="mt-3 flex gap-2 border-t border-hu-soft/40 pt-3">
                        <Button
                          size="sm"
                          onClick={() => responder.mutate({ id: s.id, status: "APROVADA" })}
                          disabled={responder.isPending}
                          className={BOTAO_PIXEL}
                        >
                          <Check className="size-4" aria-hidden />
                          {respondendoEste && responder.variables?.status === "APROVADA"
                            ? "Aprovando…"
                            : "Aprovar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleRecusar(s.id)}
                          disabled={responder.isPending}
                          aria-expanded={confirmarRecusarId === s.id}
                          className={BOTAO_OUTLINE_VERMELHO}
                        >
                          <X className="size-4" aria-hidden />
                          {recusandoEste ? "Recusando…" : "Recusar"}
                        </Button>
                      </div>

                      {confirmarRecusarId === s.id && (
                        <ConfirmacaoInline
                          pergunta={<>Recusar o pedido de <strong>{nomeProduto(s.produto_id)}</strong>?</>}
                          rotuloConfirmar="Sim, recusar"
                          rotuloConfirmando="Recusando…"
                          rotuloCancelar="Voltar"
                          confirmando={recusandoEste}
                          aoConfirmar={() =>
                            responder.mutate(
                              { id: s.id, status: "RECUSADA" },
                              { onSuccess: () => setConfirmarRecusarId(null) },
                            )
                          }
                          aoCancelar={() => setConfirmarRecusarId(null)}
                        />
                      )}
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
            <>
              <DivisorCerca className="mt-6" />
              <section className="mt-4">
                <p className="mb-3 font-pixel text-xs text-hu-muted">Respondidos</p>
                <ul className="flex flex-col gap-2">
                  {respondidas.map((s) => {
                    const sprite = spriteProduto(nomeProduto(s.produto_id))
                    const cfg = STATUS_SOLICITACAO[s.status]
                    return (
                      <li
                        key={s.id}
                        className="flex items-center gap-2 rounded-xl border border-hu-soft/60 bg-hu-panel px-3 py-2 text-hu-text opacity-70"
                      >
                        {sprite && (
                          <img
                            src={sprite}
                            alt=""
                            width={24}
                            height={24}
                            className="size-6 shrink-0 [image-rendering:pixelated]"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {nomeProduto(s.produto_id)} · {s.quantidade} muda{s.quantidade > 1 ? "s" : ""}
                          </p>
                          <p className="truncate text-xs text-hu-muted">
                            {contextoCanteiro(s.canteiro_id)}
                            {s.data_desejada_plantio
                              ? ` · para ${fmt(s.data_desejada_plantio)}`
                              : ""}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold ${cfg.chip}`}>
                          {cfg.rotulo}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            </>
          )}
        </Tabs.Content>

        <Tabs.Content value="materiais">
          {demandas.isPending && <Carregando className="mt-6" />}

          {!demandas.isPending && materiais.length === 0 && (
            <EstadoVazio ilustracao="/personagem-idoso.webp">
              Nenhum pedido de material recebido ainda.
            </EstadoVazio>
          )}

          {materiaisPendentes.length > 0 && (
            <section className="mt-5">
              <ul className="flex flex-col gap-3">
                {materiaisPendentes.map((m) => {
                  const respondendoEste = responderMaterial.isPending && responderMaterial.variables?.demandaId === m.id
                  const recusandoEste = respondendoEste && responderMaterial.variables?.status === "CANCELADA"
                  return (
                    <li
                      key={m.id}
                      className={`rounded-2xl border-2 bg-hu-panel p-4 text-hu-text ${
                        m.status === "ABERTA" ? "border-amber-400/60" : "border-hu-bright"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{m.descricao}</p>
                          <p className="mt-0.5 truncate text-sm text-hu-muted">
                            {nomeCanteiro(m.canteiro_id)} · {m.tipo_demanda}
                          </p>
                          <span className={CHIP_QUANTIDADE}>
                            {m.quantidade} {m.unidade_medida}
                          </span>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_MATERIAL[m.status].chip}`}>
                          {STATUS_MATERIAL[m.status].rotulo}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2 border-t border-hu-soft/40 pt-3">
                        {m.status === "ABERTA" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => responderMaterial.mutate({ demandaId: m.id, status: "EM_ATENDIMENTO" })}
                              disabled={responderMaterial.isPending}
                              className={BOTAO_PIXEL}
                            >
                              <Check className="size-4" aria-hidden />
                              {respondendoEste && responderMaterial.variables?.status === "EM_ATENDIMENTO"
                                ? "Aceitando…"
                                : "Aceitar"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleRecusarMaterial(m.id)}
                              disabled={responderMaterial.isPending}
                              aria-expanded={confirmarRecusarMaterialId === m.id}
                              className={BOTAO_OUTLINE_VERMELHO}
                            >
                              <X className="size-4" aria-hidden />
                              {recusandoEste ? "Recusando…" : "Recusar"}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => responderMaterial.mutate({ demandaId: m.id, status: "ATENDIDA" })}
                            disabled={responderMaterial.isPending}
                            className={BOTAO_PIXEL}
                          >
                            <Check className="size-4" aria-hidden />
                            {respondendoEste ? "Salvando…" : "Marcar como entregue"}
                          </Button>
                        )}
                      </div>

                      {confirmarRecusarMaterialId === m.id && (
                        <ConfirmacaoInline
                          pergunta={<>Recusar o pedido de <strong>{m.tipo_demanda}</strong>?</>}
                          rotuloConfirmar="Sim, recusar"
                          rotuloConfirmando="Recusando…"
                          rotuloCancelar="Voltar"
                          confirmando={recusandoEste}
                          aoConfirmar={() =>
                            responderMaterial.mutate(
                              { demandaId: m.id, status: "CANCELADA" },
                              { onSuccess: () => setConfirmarRecusarMaterialId(null) },
                            )
                          }
                          aoCancelar={() => setConfirmarRecusarMaterialId(null)}
                        />
                      )}
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
            <>
              <DivisorCerca className="mt-6" />
              <section className="mt-4">
                <p className="mb-3 font-pixel text-xs text-hu-muted">Respondidos</p>
                <ul className="flex flex-col gap-2">
                  {materiaisRespondidos.map((m) => {
                    const cfg = STATUS_MATERIAL[m.status]
                    return (
                      <li
                        key={m.id}
                        className="flex items-center gap-2 rounded-xl border border-hu-soft/60 bg-hu-panel px-3 py-2 text-hu-text opacity-70"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.descricao}</p>
                          <p className="truncate text-xs text-hu-muted">
                            {nomeCanteiro(m.canteiro_id)} · {m.tipo_demanda} · {m.quantidade} {m.unidade_medida}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold ${cfg.chip}`}>
                          {cfg.rotulo}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            </>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
