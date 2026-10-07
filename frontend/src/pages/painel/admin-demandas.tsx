import { useState } from "react"
import { Link, useParams } from "react-router"
import { AlarmClock, Check, ChevronRight, Package, Send, X } from "lucide-react"
import { usePedidosAdmin } from "@/features/admin/use-painel-admin"
import { useAtualizarStatusDemandaAdmin, type AtualizacaoPedido } from "@/features/demandas/use-demandas"
import { CATEGORIAS_MATERIAL } from "@/features/demandas/catalogo-materiais"
import { useResponderSolicitacao } from "@/features/solicitacoes/use-solicitacoes-lider"
import { useHortas } from "@/features/hortas/use-hortas"
import { useNomeProduto } from "@/features/produtos/use-nome-produto"
import { SpriteProduto } from "@/features/produtos/sprite-produto"
import { FolhaAprovarPedido } from "@/features/pedidos/folha-aprovar"
import { diaMes } from "@/features/pedidos/previsao"
import { LinhaPrevisao } from "@/features/pedidos/linha-previsao"
import { BOTAO_LINK, BOTAO_OUTLINE_VERMELHO, BOTAO_PIXEL } from "@/features/pedidos/estilos"
import { Voltar } from "@/components/voltar"
import { ConfirmacaoInline } from "@/components/confirmar"
import { DivisorCerca } from "@/components/divisor-cerca"
import { Aviso, Carregando, EstadoVazio, TelaFalhaAoCarregar } from "@/components/feedback"
import type { components } from "@/lib/api/schema"
import { cn } from "@/lib/utils"

type Pedido = components["schemas"]["PedidoAdmin"]
type StatusPedido = components["schemas"]["StatusPedido"]

const STATUS: Record<StatusPedido, { rotulo: string; chip: string }> = {
  ABERTA: { rotulo: "Esperando", chip: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200" },
  EM_ATENDIMENTO: { rotulo: "A caminho", chip: "border-green-300 bg-green-100 text-green-800 dark:border-green-500/40 dark:bg-green-500/15 dark:text-green-200" },
  ATENDIDA: { rotulo: "Entregue ✓", chip: "border-hu-soft bg-hu-soft/20 text-hu-text" },
  CANCELADA: { rotulo: "Recusado", chip: "border-red-300 bg-red-100 text-red-800 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200" },
}

const SELO_ATRASO = "border-red-400 bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200"
const SELO_REPASSADO = "border-sky-400 bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-200"
const CARTAO = "rounded-2xl border-2 border-[#5b3a1a] bg-hu-panel text-hu-text shadow-[0_3px_0_#5b3a1a]"

const emAberto = (p: Pedido) => p.status === "ABERTA" || p.status === "EM_ATENDIMENTO"
const precisaAtencao = (p: Pedido) => emAberto(p) && (p.atraso != null || p.encaminhada)
const chave = (p: Pedido) => `${p.tipo}${p.id}`

function contar(pedidos: Pedido[]) {
  const abertos = pedidos.filter(emAberto)
  return {
    atrasados: abertos.filter((p) => p.atraso != null).length,
    repassados: abertos.filter((p) => p.encaminhada).length,
    esperando: abertos.filter((p) => p.status === "ABERTA").length,
    aCaminho: abertos.filter((p) => p.status === "EM_ATENDIMENTO").length,
  }
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

export function AdminDemandasPage() {
  const pedidos = usePedidosAdmin()
  const hortas = useHortas()

  if (pedidos.isPending || hortas.isPending) return <Carregando />
  if (pedidos.isLoadingError || hortas.isLoadingError) return <TelaFalhaAoCarregar />

  const todos = pedidos.data ?? []
  const total = contar(todos)
  const linhas = (hortas.data ?? [])
    .map((h) => ({ horta: h, n: contar(todos.filter((p) => p.horta_id === h.id)) }))
    .sort(
      (a, b) =>
        b.n.atrasados - a.n.atrasados ||
        b.n.repassados - a.n.repassados ||
        b.n.esperando + b.n.aCaminho - (a.n.esperando + a.n.aCaminho) ||
        a.horta.nome.localeCompare(b.horta.nome),
    )

  const comPedido = linhas.filter(({ n }) => n.esperando + n.aCaminho > 0)
  const emDia = linhas.filter(({ n }) => n.esperando + n.aCaminho === 0)

  return (
    <div className="mx-auto max-w-2xl pb-4">
      <Voltar />
      <h1 className="mt-4 font-pixel text-sm text-hu-bright">Pedidos das hortas</h1>

      {total.atrasados + total.repassados > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Contador valor={total.atrasados} rotulo={total.atrasados === 1 ? "atrasado" : "atrasados"} icone={AlarmClock} classe={SELO_ATRASO} />
          <Contador valor={total.repassados} rotulo={total.repassados === 1 ? "repassado" : "repassados"} icone={Send} classe={SELO_REPASSADO} />
        </div>
      ) : (
        <p className={cn(CARTAO, "mt-4 flex items-center gap-2 px-4 py-3 font-bold")}>
          <Check className="size-5 shrink-0 text-hu-bright" aria-hidden />
          Nenhum pedido precisa de atenção.
        </p>
      )}

      <ul className="mt-5 flex flex-col gap-3">
        {comPedido.map(({ horta, n }) => {
          return (
            <li key={horta.id}>
              <Link
                to={`/painel/admin-demandas/${horta.id}`}
                className={cn(
                  CARTAO,
                  "flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_#5b3a1a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/50",
                  n.atrasados > 0 && "border-red-500 shadow-[0_3px_0_#b91c1c]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold">{horta.nome}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {n.atrasados > 0 && <Selo classe={SELO_ATRASO}>{plural(n.atrasados, "atrasado", "atrasados")}</Selo>}
                    {n.repassados > 0 && <Selo classe={SELO_REPASSADO}>{plural(n.repassados, "repassado", "repassados")}</Selo>}
                    {n.esperando > 0 && <Selo classe={STATUS.ABERTA.chip}>{n.esperando} esperando</Selo>}
                    {n.aCaminho > 0 && <Selo classe={STATUS.EM_ATENDIMENTO.chip}>{n.aCaminho} a caminho</Selo>}
                  </div>
                </div>
                <ChevronRight className="size-6 shrink-0 text-hu-muted" aria-hidden />
              </Link>
            </li>
          )
        })}
      </ul>

      {emDia.length > 0 && (
        <details className="mt-5">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-bold text-hu-muted">
            <Check className="size-5 text-hu-bright" aria-hidden />
            {plural(emDia.length, "horta sem pedido em aberto", "hortas sem pedido em aberto")}
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {emDia.map(({ horta }) => (
              <li key={horta.id}>
                <Link
                  to={`/painel/admin-demandas/${horta.id}`}
                  className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-hu-soft/60 bg-hu-panel px-4 text-hu-text hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
                >
                  <span className="truncate">{horta.nome}</span>
                  <ChevronRight className="size-5 shrink-0 text-hu-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function Contador({
  valor,
  rotulo,
  icone: Icone,
  classe,
}: {
  valor: number
  rotulo: string
  icone: typeof Send
  classe: string
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border-2 px-4 py-3 shadow-[0_3px_0_#5b3a1a]", valor > 0 ? classe : "border-hu-soft bg-hu-panel text-hu-muted")}>
      <Icone className="size-7 shrink-0" aria-hidden />
      <div>
        <p className="font-pixel text-base leading-none">{valor}</p>
        <p className="mt-1 text-sm font-bold">{rotulo}</p>
      </div>
    </div>
  )
}

function Selo({ classe, children }: { classe: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold", classe)}>{children}</span>
}

const ICONE_MATERIAL = new Map(
  CATEGORIAS_MATERIAL.flatMap((c) => ("itens" in c && c.itens ? c.itens.map((i) => [i.rotulo, i.Icone] as const) : [])),
)

function diasDesde(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export function AdminPedidosHortaPage() {
  const hortaId = Number(useParams().hortaId)
  const pedidos = usePedidosAdmin()
  const hortas = useHortas()
  const nomeProduto = useNomeProduto()
  const responderPlanta = useResponderSolicitacao()
  const responderMaterial = useAtualizarStatusDemandaAdmin()

  const [folha, setFolha] = useState<{ pedido: Pedido; modo: "aprovar" | "previsao" } | null>(null)
  const [recusando, setRecusando] = useState<string | null>(null)

  if (pedidos.isPending) return <Carregando />
  if (pedidos.isLoadingError) return <TelaFalhaAoCarregar voltarPara="/painel/admin-demandas" />

  const nomeHorta = hortas.data?.find((h) => h.id === hortaId)?.nome ?? "Horta"
  const daHorta = (pedidos.data ?? []).filter((p) => p.horta_id === hortaId)
  const atencao = daHorta.filter(precisaAtencao)
  const esperando = daHorta.filter((p) => p.status === "ABERTA" && !precisaAtencao(p))
  const aCaminho = daHorta.filter((p) => p.status === "EM_ATENDIMENTO" && !precisaAtencao(p))
  const encerrados = daHorta.filter((p) => !emAberto(p))

  const mutacao = (p: Pedido) => (p.tipo === "PLANTA" ? responderPlanta : responderMaterial)
  const salvando = (p: Pedido) => {
    const m = mutacao(p)
    const v = m.variables as { id?: number; demandaId?: number } | undefined
    return m.isPending && (p.tipo === "PLANTA" ? v?.id : v?.demandaId) === p.id
  }

  function atualizar(p: Pedido, atualizacao: AtualizacaoPedido, aoTerminar?: () => void) {
    const opcoes = { onSuccess: aoTerminar }
    if (p.tipo === "PLANTA") responderPlanta.mutate({ id: p.id, ...atualizacao }, opcoes)
    else responderMaterial.mutate({ hortaId: p.horta_id, demandaId: p.id, ...atualizacao }, opcoes)
  }

  const titulo = (p: Pedido) => (p.tipo === "PLANTA" ? nomeProduto(p.produto_id) : (p.descricao ?? "Material"))
  const quantidade = (p: Pedido) =>
    p.tipo === "PLANTA" ? plural(p.quantidade, "muda", "mudas") : `${p.quantidade} ${p.unidade ?? ""}`.trim()
  const quem = (p: Pedido) =>
    p.canteiro_numero == null
      ? "Pedido do líder para a horta"
      : [p.solicitante, `Placa ${p.canteiro_numero}`].filter(Boolean).join(" · ")

  const cartao = (p: Pedido) => {
    const IconeMaterial = ICONE_MATERIAL.get(p.descricao ?? "") ?? Package
    const ocupado = salvando(p)
    const dias = diasDesde(p.criado_em)
    return (
      <li key={chave(p)} className={cn(CARTAO, "p-4", p.atraso && "border-red-500 shadow-[0_3px_0_#b91c1c]")}>
        <div className="flex items-start gap-3">
          {p.tipo === "PLANTA" ? (
            <SpriteProduto nome={titulo(p)} className="size-11 shrink-0" />
          ) : (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-hu-soft/30">
              <IconeMaterial className="size-6 text-hu-bright" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold">{titulo(p)} · {quantidade(p)}</p>
            <p className="mt-0.5 text-sm text-hu-muted">{quem(p)}</p>
            <p className="text-sm text-hu-muted">{dias === 0 ? "Pedido hoje" : `Pedido há ${plural(dias, "dia", "dias")}`}</p>
          </div>
          <Selo classe={STATUS[p.status].chip}>{STATUS[p.status].rotulo}</Selo>
        </div>

        {emAberto(p) && (p.atraso || p.encaminhada) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.atraso === "SEM_RESPOSTA" && (
              <Selo classe={SELO_ATRASO}><AlarmClock className="size-3.5" aria-hidden />Sem resposta há {plural(dias, "dia", "dias")}</Selo>
            )}
            {p.atraso === "PREVISAO_VENCIDA" && p.previsao_entrega && (
              <Selo classe={SELO_ATRASO}><AlarmClock className="size-3.5" aria-hidden />Passou da previsão ({diaMes(p.previsao_entrega)})</Selo>
            )}
            {p.encaminhada && <Selo classe={SELO_REPASSADO}><Send className="size-3.5" aria-hidden />Repassado pelo líder</Selo>}
          </div>
        )}

        {p.observacao && <p className="mt-2 text-sm italic text-hu-muted">"{p.observacao}"</p>}

        {p.status === "EM_ATENDIMENTO" &&
          (p.previsao_entrega && p.atraso == null ? (
            <LinhaPrevisao previsao={p.previsao_entrega} className="mt-2" />
          ) : p.previsao_entrega == null ? (
            <p className="mt-2 text-sm text-hu-muted">Sem previsão de entrega</p>
          ) : null)}

        {emAberto(p) && (
          <div className="mt-3 border-t border-hu-soft/40 pt-3">
            <div className="flex gap-2">
              {p.status === "ABERTA" ? (
                <>
                  <button type="button" onClick={() => setFolha({ pedido: p, modo: "aprovar" })} disabled={ocupado} className={BOTAO_PIXEL}>
                    <Check className="size-4" aria-hidden />
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecusando(recusando === chave(p) ? null : chave(p))}
                    disabled={ocupado}
                    aria-expanded={recusando === chave(p)}
                    className={BOTAO_OUTLINE_VERMELHO}
                  >
                    <X className="size-4" aria-hidden />
                    Recusar
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => atualizar(p, { status: "ATENDIDA" })} disabled={ocupado} className={BOTAO_PIXEL}>
                  <Check className="size-4" aria-hidden />
                  {ocupado ? "Salvando…" : "Marcar como entregue"}
                </button>
              )}
            </div>
            {p.status === "EM_ATENDIMENTO" && (
              <button type="button" onClick={() => setFolha({ pedido: p, modo: "previsao" })} className={cn(BOTAO_LINK, "mt-1")}>
                {p.previsao_entrega ? "Mudar previsão" : "Definir previsão"}
              </button>
            )}
            {recusando === chave(p) && (
              <ConfirmacaoInline
                pergunta={<>Recusar o pedido de <strong>{titulo(p)}</strong>?</>}
                rotuloConfirmar="Sim, recusar"
                rotuloConfirmando="Recusando…"
                rotuloCancelar="Voltar"
                confirmando={ocupado}
                aoConfirmar={() => atualizar(p, { status: "CANCELADA" }, () => setRecusando(null))}
                aoCancelar={() => setRecusando(null)}
              />
            )}
          </div>
        )}
      </li>
    )
  }

  const secao = (titulo: string, lista: Pedido[], classe?: string) => {
    if (lista.length === 0) return null
    return (
      <section className="mt-6">
        <p className={cn("mb-3 font-pixel text-xs text-hu-muted", classe)}>
          {titulo} ({lista.length})
        </p>
        <ul className="flex flex-col gap-3">
          {lista.map(cartao)}
        </ul>
      </section>
    )
  }

  const erro = (responderPlanta.error ?? responderMaterial.error)?.message

  return (
    <div className="mx-auto max-w-2xl pb-4">
      <Voltar to="/painel/admin-demandas" />
      <h1 className="mt-4 font-pixel text-sm text-hu-bright">{nomeHorta}</h1>

      {atencao.length + esperando.length + aCaminho.length === 0 && (
        <EstadoVazio ilustracao="/personagem-cachorro.webp">Nenhum pedido em aberto nesta horta.</EstadoVazio>
      )}

      {secao("Precisam de atenção", atencao, "text-red-600 dark:text-red-300")}
      {secao("Esperando resposta", esperando)}
      {secao("A caminho", aCaminho)}

      {erro && !folha && <Aviso variante="erro" className="mt-4">{erro}</Aviso>}

      {encerrados.length > 0 && (
        <>
          <DivisorCerca className="mt-6" />
          <details className="mt-4">
            <summary className="flex min-h-11 cursor-pointer items-center font-pixel text-xs text-hu-muted">
              Últimos entregues e recusados ({encerrados.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-2">
              {encerrados.map((p) => (
                <li key={chave(p)} className="flex items-center gap-2 rounded-xl border border-hu-soft/60 bg-hu-panel px-3 py-2 text-hu-text opacity-80">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{titulo(p)} · {quantidade(p)}</p>
                    <p className="truncate text-xs text-hu-muted">{quem(p)}</p>
                  </div>
                  <Selo classe={STATUS[p.status].chip}>{STATUS[p.status].rotulo}</Selo>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}

      {folha && (
        <FolhaAprovarPedido
          key={chave(folha.pedido)}
          oQue={`${titulo(folha.pedido)} · ${quantidade(folha.pedido)}`}
          paraQuem={folha.pedido.solicitante ?? (folha.pedido.canteiro_numero == null ? "o líder da horta" : "quem pediu")}
          modo={folha.modo}
          previsaoAtual={folha.pedido.previsao_entrega}
          salvando={salvando(folha.pedido)}
          erro={erro}
          aoFechar={() => setFolha(null)}
          aoConfirmar={(previsao) =>
            atualizar(folha.pedido, { status: "EM_ATENDIMENTO", previsao }, () => setFolha(null))
          }
        />
      )}
    </div>
  )
}
