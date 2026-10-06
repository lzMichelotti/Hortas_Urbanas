import { Send, Sprout } from "lucide-react"
import { useDemandas, useAtualizarStatusDemandaAdmin } from "@/features/demandas/use-demandas"
import { useSolicitacoesLider, useResponderSolicitacao } from "@/features/solicitacoes/use-solicitacoes-lider"
import { useCanteiros } from "@/features/canteiros/use-canteiros"
import { useHortas } from "@/features/hortas/use-hortas"
import { useNomeProduto } from "@/features/produtos/use-nome-produto"
import { spriteProduto } from "@/features/produtos/sprites"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import type { components } from "@/lib/api/schema"
import { Aviso, Carregando, TelaFalhaAoCarregar } from "@/components/feedback"

type StatusPedido = components["schemas"]["StatusPedido"]

const STATUS_CONFIG: Record<StatusPedido, { rotulo: string; cor: string }> = {
  ABERTA: { rotulo: "Aguardando", cor: "bg-amber-400 text-black" },
  EM_ATENDIMENTO: { rotulo: "Em andamento", cor: "bg-hu-bright text-hu-bg" },
  ATENDIDA: { rotulo: "Concluída ✓", cor: "bg-white text-hu-bg" },
  CANCELADA: { rotulo: "Cancelada", cor: "bg-red-500 text-hu-text" },
}

const PROXIMO: Partial<Record<StatusPedido, StatusPedido>> = {
  ABERTA: "EM_ATENDIMENTO",
  EM_ATENDIMENTO: "ATENDIDA",
}

const ROTULO_PROXIMO: Partial<Record<StatusPedido, string>> = {
  ABERTA: "Iniciar atendimento",
  EM_ATENDIMENTO: "Marcar como concluída",
}

const emAberto = (s: StatusPedido) => s === "ABERTA" || s === "EM_ATENDIMENTO"

const BOTAO = "rounded-lg bg-hu-bright text-sm font-bold text-hu-bg hover:bg-hu-bright/90"

export function AdminDemandasPage() {
  const demandas = useDemandas()
  const solicitacoes = useSolicitacoesLider()
  const hortas = useHortas()
  const canteiros = useCanteiros()
  const nomeProduto = useNomeProduto()
  const atualizar = useAtualizarStatusDemandaAdmin()
  const responder = useResponderSolicitacao()

  const nomeHorta = (id: number | null | undefined) =>
    id == null ? "Horta" : hortas.data?.find((h) => h.id === id)?.nome ?? `Horta #${id}`

  const hortaDoCanteiro = (canteiroId: number) =>
    canteiros.data?.find((c) => c.id === canteiroId)?.horta_id

  if (demandas.isPending || solicitacoes.isPending || hortas.isPending) {
    return <Carregando />
  }
  if (demandas.isLoadingError || solicitacoes.isLoadingError) {
    return <TelaFalhaAoCarregar />
  }

  const materiais = demandas.data ?? []
  const plantas = solicitacoes.data ?? []

  const materiaisAbertos = materiais.filter((d) => emAberto(d.status))
  const plantasAbertas = plantas.filter((s) => emAberto(s.status))
  const concluidos = [
    ...materiais.filter((d) => !emAberto(d.status)).map((d) => ({ tipo: "material" as const, d })),
    ...plantas.filter((s) => !emAberto(s.status)).map((s) => ({ tipo: "planta" as const, s })),
  ]

  const aguardando =
    materiaisAbertos.filter((d) => d.status === "ABERTA").length +
    plantasAbertas.filter((s) => s.status === "ABERTA").length

  const vazio = materiais.length === 0 && plantas.length === 0

  return (
    <div className="mx-auto max-w-2xl pb-4">
      <Voltar />
      <h1 className="mt-4 font-pixel text-sm text-hu-bright">Pedidos das hortas</h1>

      {vazio && (
        <p className="mt-6 rounded-2xl border-4 border-hu-bright bg-hu-panel p-8 text-center text-hu-text">
          Nenhum pedido encaminhado pelas hortas.
        </p>
      )}

      {aguardando > 0 && (
        <p className="mt-5 font-pixel text-xs text-amber-400">
          {aguardando} aguardando atendimento
        </p>
      )}

      {plantasAbertas.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {plantasAbertas.map((s) => {
            const cfg = STATUS_CONFIG[s.status]
            const proximo = PROXIMO[s.status]
            const rotulo = ROTULO_PROXIMO[s.status]
            const nome = nomeProduto(s.produto_id)
            const sprite = spriteProduto(nome)
            const salvandoEste = responder.isPending && responder.variables?.id === s.id
            return (
              <li
                key={`s${s.id}`}
                className={`rounded-2xl border-4 bg-hu-panel p-4 text-hu-text ${
                  s.status === "ABERTA" ? "border-amber-400/60" : "border-hu-bright"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    {sprite && (
                      <img
                        src={sprite}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 [image-rendering:pixelated]"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-hu-text">
                        {nomeHorta(hortaDoCanteiro(s.canteiro_id))}
                      </p>
                      <p className="mt-0.5 font-bold">{nome}</p>
                      <p className="mt-1 text-sm text-hu-muted">
                        {s.quantidade} {s.quantidade === 1 ? "muda" : "mudas"}
                      </p>
                      {s.justificativa && (
                        <p className="mt-0.5 text-sm text-hu-text/80">{s.justificativa}</p>
                      )}
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-hu-muted">
                        <Sprout className="size-4 shrink-0 text-hu-bright" aria-hidden />
                        Pedido de planta, encaminhado pelo líder
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${cfg.cor}`}>
                    {cfg.rotulo}
                  </span>
                </div>

                {proximo && rotulo && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      onClick={() => responder.mutate({ id: s.id, status: proximo })}
                      disabled={responder.isPending}
                      className={BOTAO}
                    >
                      {salvandoEste ? "Atualizando…" : `✓ ${rotulo}`}
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {materiaisAbertos.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {materiaisAbertos.map((d) => {
            const cfg = STATUS_CONFIG[d.status]
            const proximo = PROXIMO[d.status]
            const rotulo = ROTULO_PROXIMO[d.status]
            const atualizandoEste = atualizar.isPending && atualizar.variables?.demandaId === d.id
            return (
              <li
                key={`d${d.id}`}
                className={`rounded-2xl border-4 bg-hu-panel p-4 text-hu-text ${
                  d.status === "ABERTA" ? "border-amber-400/60" : "border-hu-bright"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-hu-text">{nomeHorta(d.horta_id)}</p>
                    <p className="mt-0.5 font-bold">{d.tipo_demanda}</p>
                    <p className="mt-0.5 text-sm text-hu-text/80">{d.descricao}</p>
                    <p className="mt-1 text-sm text-hu-muted">
                      {d.quantidade} {d.unidade_medida}
                    </p>
                    {d.canteiro_id != null && (
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-hu-muted">
                        <Send className="size-4 shrink-0 text-hu-bright" aria-hidden />
                        Pedido de um canteiro, encaminhado pelo líder
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${cfg.cor}`}>
                    {cfg.rotulo}
                  </span>
                </div>

                {proximo && rotulo && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      onClick={() =>
                        atualizar.mutate({ hortaId: d.horta_id, demandaId: d.id, status: proximo })
                      }
                      disabled={atualizar.isPending}
                      className={BOTAO}
                    >
                      {atualizandoEste ? "Atualizando…" : `✓ ${rotulo}`}
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {(atualizar.isError || responder.isError) && (
        <Aviso variante="erro" className="mt-4">
          {(atualizar.error ?? responder.error)?.message}
        </Aviso>
      )}

      {concluidos.length > 0 && (
        <section className="mt-6">
          <p className="mb-3 font-pixel text-xs text-hu-muted">Últimos atendidos</p>
          <ul className="flex flex-col gap-3">
            {concluidos.map((item) => {
              const status = item.tipo === "material" ? item.d.status : item.s.status
              const cfg = STATUS_CONFIG[status]
              const horta =
                item.tipo === "material"
                  ? nomeHorta(item.d.horta_id)
                  : nomeHorta(hortaDoCanteiro(item.s.canteiro_id))
              return (
                <li
                  key={item.tipo === "material" ? `d${item.d.id}` : `s${item.s.id}`}
                  className="flex items-start justify-between gap-3 rounded-2xl border-4 border-hu-soft bg-hu-panel p-4 text-hu-text opacity-70"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-hu-text">{horta}</p>
                    {item.tipo === "material" ? (
                      <>
                        <p className="mt-0.5 font-bold">{item.d.tipo_demanda}</p>
                        <p className="mt-0.5 text-sm text-hu-muted">{item.d.descricao}</p>
                        <p className="mt-1 text-sm text-hu-muted">
                          {item.d.quantidade} {item.d.unidade_medida}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-0.5 font-bold">{nomeProduto(item.s.produto_id)}</p>
                        <p className="mt-1 text-sm text-hu-muted">
                          {item.s.quantidade} {item.s.quantidade === 1 ? "muda" : "mudas"}
                        </p>
                      </>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${cfg.cor}`}>
                    {cfg.rotulo}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
