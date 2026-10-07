import { useState } from "react"
import { Tabs } from "radix-ui"
import { Check, Send, Undo2, X } from "lucide-react"
import {
  useSolicitacoesLider,
  useResponderSolicitacao,
  useEncaminharSolicitacao,
} from "@/features/solicitacoes/use-solicitacoes-lider"
import { useDemandas, useAtualizarStatusDemanda, useEncaminharDemanda } from "@/features/demandas/use-demandas"
import { useCanteiros } from "@/features/canteiros/use-canteiros"
import { useUsuarios } from "@/features/usuarios/use-usuarios"
import { useMe } from "@/features/auth/use-me"
import { useNomeProduto } from "@/features/produtos/use-nome-produto"
import { spriteProduto } from "@/features/produtos/sprites"
import { Voltar } from "@/components/voltar"
import { dataBR as fmt } from "@/features/ciclos/status"
import { Button } from "@/components/ui/button"
import type { components } from "@/lib/api/schema"
import { Aviso, Carregando, EstadoVazio, TelaFalhaAoCarregar } from "@/components/feedback"
import { ConfirmacaoInline } from "@/components/confirmar"
import { FolhaAprovarPedido } from "@/features/pedidos/folha-aprovar"
import { LinhaPrevisao } from "@/features/pedidos/linha-previsao"
import { BOTAO_LINK, BOTAO_OUTLINE_VERMELHO, BOTAO_PIXEL } from "@/features/pedidos/estilos"
import { DivisorCerca } from "@/components/divisor-cerca"

type StatusPedido = components["schemas"]["StatusPedido"]

const STATUS: Record<StatusPedido, { rotulo: string; chip: string }> = {
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

const BOTAO_OUTLINE =
  "flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-hu-soft bg-transparent font-bold text-hu-text hover:bg-black/5 disabled:pointer-events-none disabled:opacity-50"
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
  const encaminhar = useEncaminharDemanda(me.data?.horta_id ?? 0)
  const encaminharPlanta = useEncaminharSolicitacao()

  const [aba, setAba] = useState<"plantas" | "materiais">("plantas")
  const [confirmarRecusarId, setConfirmarRecusarId] = useState<number | null>(null)
  const [confirmarRecusarMaterialId, setConfirmarRecusarMaterialId] = useState<number | null>(null)
  const [folha, setFolha] = useState<{
    tipo: "planta" | "material"
    id: number
    oQue: string
    canteiroId: number | null | undefined
    modo: "aprovar" | "previsao"
    previsaoAtual?: string | null
  } | null>(null)

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
    return [`Placa ${c.numero}`, c.identificacao, responsavel].filter(Boolean).join(" · ")
  }
  const responsavelDo = (id: number | null | undefined) => {
    const c = id != null ? canteiroPorId.get(id) : undefined
    return (c?.usuario_id != null ? usuarioPorId.get(c.usuario_id)?.nome : undefined) ?? "quem pediu"
  }

  // Previsão (ou a falta dela) de um pedido já aprovado, com o atalho para mudar.
  const previsaoDoAprovado = (previsao: string | null | undefined, abrir: () => void) => (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2">
      {previsao ? (
        <LinhaPrevisao previsao={previsao} />
      ) : (
        <p className="text-sm text-hu-muted">Sem previsão de entrega</p>
      )}
      <button type="button" onClick={abrir} className={BOTAO_LINK}>
        {previsao ? "Mudar previsão" : "Definir previsão"}
      </button>
    </div>
  )

  function toggleRecusar(id: number) {
    setConfirmarRecusarId((atual) => (atual === id ? null : id))
  }

  function toggleRecusarMaterial(id: number) {
    setConfirmarRecusarMaterialId((atual) => (atual === id ? null : id))
  }

  if (solicitacoes.isPending || canteiros.isPending) {
    return <Carregando />
  }
  if (solicitacoes.isLoadingError || canteiros.isLoadingError || demandas.isLoadingError) {
    return <TelaFalhaAoCarregar />
  }

  const emAberto = (status: StatusPedido) => status === "ABERTA" || status === "EM_ATENDIMENTO"

  const pendentes = (solicitacoes.data ?? []).filter((s) => emAberto(s.status))
  const respondidas = (solicitacoes.data ?? []).filter((s) => !emAberto(s.status))
  const novasPlantas = pendentes.filter((s) => s.status === "ABERTA").length

  const materiais = (demandas.data ?? []).filter((d) => d.canteiro_id != null)
  const materiaisPendentes = materiais.filter((m) => emAberto(m.status))
  const materiaisRespondidos = materiais.filter((m) => !emAberto(m.status))
  const novosMateriais = materiaisPendentes.filter((m) => m.status === "ABERTA").length

  return (
    <div className="mx-auto max-w-2xl pb-4">
      <Voltar />
      <h1 className="mt-4 font-pixel text-sm text-hu-bright">Solicitações</h1>

      <Tabs.Root value={aba} onValueChange={(v) => setAba(v as "plantas" | "materiais")}>
        <Tabs.List className="mt-4 grid grid-cols-2 gap-2">
          <Tabs.Trigger value="plantas" className={ABA_CLASSE}>
            Plantas
            {novasPlantas > 0 && <span className="rounded-full bg-amber-400 px-2 text-xs text-black">{novasPlantas}</span>}
          </Tabs.Trigger>
          <Tabs.Trigger value="materiais" className={ABA_CLASSE}>
            Materiais
            {novosMateriais > 0 && <span className="rounded-full bg-amber-400 px-2 text-xs text-black">{novosMateriais}</span>}
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
              {novasPlantas > 0 && (
                <p className="mb-3 font-pixel text-xs text-amber-400">
                  {novasPlantas} aguardando resposta
                </p>
              )}
              <ul className="flex flex-col gap-3">
                {pendentes.map((s) => {
                  const respondendoEste = responder.isPending && responder.variables?.id === s.id
                  const recusandoEste = respondendoEste && responder.variables?.status === "CANCELADA"
                  const sprite = spriteProduto(nomeProduto(s.produto_id))
                  const encaminhandoEstaPlanta =
                    encaminharPlanta.isPending && encaminharPlanta.variables?.id === s.id
                  return (
                    <li
                      key={s.id}
                      className={`rounded-2xl border-2 bg-hu-panel p-4 text-hu-text ${
                        s.status === "ABERTA" ? "border-amber-400/60" : "border-hu-bright"
                      }`}
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
                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS[s.status].chip}`}>
                          {STATUS[s.status].rotulo}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2 border-t border-hu-soft/40 pt-3">
                        {s.status === "ABERTA" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                setFolha({
                                  tipo: "planta",
                                  id: s.id,
                                  oQue: `${nomeProduto(s.produto_id)} · ${s.quantidade} muda${s.quantidade > 1 ? "s" : ""}`,
                                  canteiroId: s.canteiro_id,
                                  modo: "aprovar",
                                })
                              }
                              disabled={responder.isPending}
                              className={BOTAO_PIXEL}
                            >
                              <Check className="size-4" aria-hidden />
                              Aprovar
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
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => responder.mutate({ id: s.id, status: "ATENDIDA" })}
                            disabled={responder.isPending}
                            className={BOTAO_PIXEL}
                          >
                            <Check className="size-4" aria-hidden />
                            {respondendoEste ? "Salvando…" : "Marcar como entregue"}
                          </Button>
                        )}
                      </div>

                      {s.status === "EM_ATENDIMENTO" &&
                        previsaoDoAprovado(s.previsao_entrega, () =>
                          setFolha({
                            tipo: "planta",
                            id: s.id,
                            oQue: `${nomeProduto(s.produto_id)} · ${s.quantidade} muda${s.quantidade > 1 ? "s" : ""}`,
                            canteiroId: s.canteiro_id,
                            modo: "previsao",
                            previsaoAtual: s.previsao_entrega,
                          }),
                        )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {s.encaminhada_em == null ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => encaminharPlanta.mutate({ id: s.id, encaminhada: true })}
                            disabled={encaminharPlanta.isPending}
                            className={BOTAO_OUTLINE}
                          >
                            <Send className="size-4" aria-hidden />
                            {encaminhandoEstaPlanta ? "Enviando…" : "Pedir ajuda à administração"}
                          </Button>
                        ) : (
                          <>
                            <span className="flex items-center gap-1.5 text-sm font-bold text-hu-bright">
                              <Send className="size-4 shrink-0" aria-hidden />
                              A administração já está vendo
                            </span>
                            <button
                              type="button"
                              onClick={() => encaminharPlanta.mutate({ id: s.id, encaminhada: false })}
                              disabled={encaminharPlanta.isPending}
                              className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-hu-muted underline underline-offset-2 hover:text-hu-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright disabled:opacity-50"
                            >
                              <Undo2 className="size-4 shrink-0" aria-hidden />
                              {encaminhandoEstaPlanta ? "Desfazendo…" : "Desfazer"}
                            </button>
                          </>
                        )}
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
                              { id: s.id, status: "CANCELADA" },
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

          {encaminharPlanta.isError && (
            <Aviso variante="erro" className="mt-4">
              {encaminharPlanta.error.message}
            </Aviso>
          )}

          {respondidas.length > 0 && (
            <>
              <DivisorCerca className="mt-6" />
              <section className="mt-4">
                <p className="mb-3 font-pixel text-xs text-hu-muted">Últimos respondidos</p>
                <ul className="flex flex-col gap-2">
                  {respondidas.map((s) => {
                    const sprite = spriteProduto(nomeProduto(s.produto_id))
                    const cfg = STATUS[s.status]
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
              {novosMateriais > 0 && (
                <p className="mb-3 font-pixel text-xs text-amber-400">
                  {novosMateriais} aguardando resposta
                </p>
              )}
              <ul className="flex flex-col gap-3">
                {materiaisPendentes.map((m) => {
                  const respondendoEste = responderMaterial.isPending && responderMaterial.variables?.demandaId === m.id
                  const recusandoEste = respondendoEste && responderMaterial.variables?.status === "CANCELADA"
                  const encaminhandoEste = encaminhar.isPending && encaminhar.variables?.demandaId === m.id
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
                            {contextoCanteiro(m.canteiro_id)} · {m.tipo_demanda}
                          </p>
                          <span className={CHIP_QUANTIDADE}>
                            {m.quantidade} {m.unidade_medida}
                          </span>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS[m.status].chip}`}>
                          {STATUS[m.status].rotulo}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2 border-t border-hu-soft/40 pt-3">
                        {m.status === "ABERTA" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                setFolha({
                                  tipo: "material",
                                  id: m.id,
                                  oQue: `${m.descricao} · ${m.quantidade} ${m.unidade_medida}`,
                                  canteiroId: m.canteiro_id,
                                  modo: "aprovar",
                                })
                              }
                              disabled={responderMaterial.isPending}
                              className={BOTAO_PIXEL}
                            >
                              <Check className="size-4" aria-hidden />
                              Aceitar
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

                      {m.status === "EM_ATENDIMENTO" &&
                        previsaoDoAprovado(m.previsao_entrega, () =>
                          setFolha({
                            tipo: "material",
                            id: m.id,
                            oQue: `${m.descricao} · ${m.quantidade} ${m.unidade_medida}`,
                            canteiroId: m.canteiro_id,
                            modo: "previsao",
                            previsaoAtual: m.previsao_entrega,
                          }),
                        )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {m.encaminhada_em == null ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => encaminhar.mutate({ demandaId: m.id, encaminhada: true })}
                            disabled={encaminhar.isPending}
                            className={BOTAO_OUTLINE}
                          >
                            <Send className="size-4" aria-hidden />
                            {encaminhandoEste ? "Enviando…" : "Pedir ajuda à administração"}
                          </Button>
                        ) : (
                          <>
                            <span className="flex items-center gap-1.5 text-sm font-bold text-hu-bright">
                              <Send className="size-4 shrink-0" aria-hidden />
                              A administração já está vendo
                            </span>
                            <button
                              type="button"
                              onClick={() => encaminhar.mutate({ demandaId: m.id, encaminhada: false })}
                              disabled={encaminhar.isPending}
                              className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-hu-muted underline underline-offset-2 hover:text-hu-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright disabled:opacity-50"
                            >
                              <Undo2 className="size-4 shrink-0" aria-hidden />
                              {encaminhandoEste ? "Desfazendo…" : "Desfazer"}
                            </button>
                          </>
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

          {encaminhar.isError && (
            <Aviso variante="erro" className="mt-4">
              {encaminhar.error.message}
            </Aviso>
          )}

          {materiaisRespondidos.length > 0 && (
            <>
              <DivisorCerca className="mt-6" />
              <section className="mt-4">
                <p className="mb-3 font-pixel text-xs text-hu-muted">Últimos respondidos</p>
                <ul className="flex flex-col gap-2">
                  {materiaisRespondidos.map((m) => {
                    const cfg = STATUS[m.status]
                    return (
                      <li
                        key={m.id}
                        className="flex items-center gap-2 rounded-xl border border-hu-soft/60 bg-hu-panel px-3 py-2 text-hu-text opacity-70"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.descricao}</p>
                          <p className="truncate text-xs text-hu-muted">
                            {contextoCanteiro(m.canteiro_id)} · {m.tipo_demanda} · {m.quantidade} {m.unidade_medida}
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

      {folha && (
        <FolhaAprovarPedido
          key={`${folha.tipo}${folha.id}${folha.modo}`}
          oQue={folha.oQue}
          paraQuem={responsavelDo(folha.canteiroId)}
          modo={folha.modo}
          previsaoAtual={folha.previsaoAtual}
          salvando={folha.tipo === "planta" ? responder.isPending : responderMaterial.isPending}
          erro={(folha.tipo === "planta" ? responder.error : responderMaterial.error)?.message}
          aoFechar={() => setFolha(null)}
          aoConfirmar={(previsao) => {
            const fechar = { onSuccess: () => setFolha(null) }
            if (folha.tipo === "planta") responder.mutate({ id: folha.id, status: "EM_ATENDIMENTO", previsao }, fechar)
            else responderMaterial.mutate({ demandaId: folha.id, status: "EM_ATENDIMENTO", previsao }, fechar)
          }}
        />
      )}
    </div>
  )
}
