import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { useMeuCanteiro } from "@/features/canteiro/use-meu-canteiro"
import { SemCanteiro } from "@/features/canteiro/sem-canteiro"
import { useCiclos, useAtualizarStatusCiclo } from "@/features/ciclos/use-ciclos"
import { useNomeProduto } from "@/features/produtos/use-nome-produto"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import type { components } from "@/lib/api/schema"
import { Aviso, Carregando } from "@/components/feedback"
import { EscolherMotivoPerda } from "@/features/ciclos/motivo-perda"
import { rotuloMotivo } from "@/features/ciclos/motivos"

type StatusCiclo = components["schemas"]["StatusCiclo"]

const fmt = (d: string) => d.split("-").reverse().join("/")

const STATUS: Record<StatusCiclo, { rotulo: string; cor: string }> = {
  PLANTADO: { rotulo: "Plantado", cor: "bg-hu-soft text-hu-text" },
  EM_CRESCIMENTO: { rotulo: "Crescendo", cor: "bg-hu-bright text-hu-bg" },
  PRONTO_PARA_COLHEITA: { rotulo: "Pronto p/ colher", cor: "bg-amber-400 text-black" },
  COLHIDO: { rotulo: "Colhido ✓", cor: "bg-hu-soft text-hu-text" },
  PERDIDO: { rotulo: "Perdido", cor: "bg-red-500 text-white" },
}

const PROXIMO: Partial<Record<StatusCiclo, StatusCiclo>> = {
  PLANTADO: "EM_CRESCIMENTO",
  EM_CRESCIMENTO: "PRONTO_PARA_COLHEITA",
}

const ROTULO_PROXIMO: Partial<Record<StatusCiclo, string>> = {
  PLANTADO: "Está crescendo",
  EM_CRESCIMENTO: "Pronto pra colher",
}

// Volta uma etapa — corrige toque errado sem precisar de confirmação (é o desfazer).
const ANTERIOR: Partial<Record<StatusCiclo, StatusCiclo>> = {
  EM_CRESCIMENTO: "PLANTADO",
  PRONTO_PARA_COLHEITA: "EM_CRESCIMENTO",
}

export function CalendarioPage() {
  const canteiro = useMeuCanteiro()
  const ciclos = useCiclos(canteiro.data?.id)
  const atualizar = useAtualizarStatusCiclo(canteiro.data?.id ?? 0)
  const nomeProduto = useNomeProduto()
  const [confirmarPerdaId, setConfirmarPerdaId] = useState<number | null>(null)

  if (canteiro.isPending) return <Carregando />
  if (canteiro.isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <Aviso variante="erro" className="mt-6" aoTentarNovamente={() => canteiro.refetch()}>
          Não foi possível carregar agora. Veja sua internet e tente de novo.
        </Aviso>
      </div>
    )
  }
  if (!canteiro.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <SemCanteiro className="mt-6" />
      </div>
    )
  }
  if (ciclos.isPending) return <Carregando />

  const ativos = (ciclos.data ?? []).filter((c) => c.status !== "COLHIDO" && c.status !== "PERDIDO")
  const finalizados = (ciclos.data ?? []).filter((c) => c.status === "COLHIDO" || c.status === "PERDIDO")

  const ordenar = (lista: typeof ativos) =>
    [...lista].sort((a, b) => a.previsao_colheita.localeCompare(b.previsao_colheita))

  return (
    <div className="mx-auto max-w-2xl">
      <Voltar />
      <h1 className="mt-4 font-pixel text-sm text-hu-bright">Calendário — {canteiro.data.identificacao}</h1>

      {(ciclos.data ?? []).length === 0 ? (
        <p className="mt-6 rounded-2xl border-4 border-hu-bright bg-hu-panel p-8 text-center text-hu-text">
          Nada plantado ainda. 🌱
        </p>
      ) : (
        <>
          {ativos.length > 0 && (
            <ul className="mt-4 flex flex-col gap-3">
              {ordenar(ativos).map((c) => {
                const status = STATUS[c.status] ?? { rotulo: c.status, cor: "bg-hu-soft text-hu-text" }
                const proximoStatus = PROXIMO[c.status]
                const rotuloProximo = ROTULO_PROXIMO[c.status]
                const anteriorStatus = ANTERIOR[c.status]
                const atualizandoEste = atualizar.isPending && atualizar.variables?.id === c.id

                return (
                  <li key={c.id} className="rounded-2xl border-4 border-hu-bright bg-hu-panel p-4 text-hu-text">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold">{nomeProduto(c.produto_id)}</p>
                        <p className="mt-1 text-sm text-hu-muted">
                          🌱 {fmt(c.data_plantio)}
                          {" · "}
                          🧺 colheita prevista {fmt(c.previsao_colheita)}
                          {c.quantidade ? ` · ${c.quantidade} un.` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${status.cor}`}>
                        {status.rotulo}
                      </span>
                    </div>

                    {(proximoStatus || anteriorStatus) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {proximoStatus && rotuloProximo && (
                          <Button
                            size="sm"
                            onClick={() => atualizar.mutate({ id: c.id, status: proximoStatus })}
                            disabled={atualizar.isPending}
                            className="h-11 rounded-lg bg-hu-bright text-sm font-bold text-hu-bg hover:bg-hu-bright/90"
                          >
                            {atualizandoEste ? "Atualizando…" : `✓ ${rotuloProximo}`}
                          </Button>
                        )}
                        {anteriorStatus && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => atualizar.mutate({ id: c.id, status: anteriorStatus })}
                            disabled={atualizar.isPending}
                            className="h-11 gap-1.5 rounded-lg border-hu-soft bg-transparent text-sm text-hu-muted hover:bg-black/5"
                          >
                            <RotateCcw className="size-4" aria-hidden />
                            Voltar etapa
                          </Button>
                        )}
                        {proximoStatus && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmarPerdaId(c.id)}
                            disabled={atualizar.isPending}
                            className="h-11 rounded-lg border-red-400/50 bg-transparent text-sm text-red-600 hover:bg-red-500/15"
                          >
                            Perdeu-se
                          </Button>
                        )}
                      </div>
                    )}
                    {confirmarPerdaId === c.id && (
                      <EscolherMotivoPerda
                        pergunta={<>O que houve com <strong>{nomeProduto(c.produto_id)}</strong>? Depois não dá pra desfazer.</>}
                        salvando={atualizandoEste}
                        aoEscolher={(motivo, observacao) =>
                          atualizar.mutate(
                            { id: c.id, status: "PERDIDO", motivo_perda: motivo, observacao_perda: observacao },
                            { onSuccess: () => setConfirmarPerdaId(null) },
                          )
                        }
                        aoCancelar={() => setConfirmarPerdaId(null)}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {finalizados.length > 0 && (
            <section className="mt-6">
              <p className="mb-3 font-pixel text-xs text-hu-muted">Histórico</p>
              <ul className="flex flex-col gap-3">
                {ordenar(finalizados).map((c) => {
                  const status = STATUS[c.status] ?? { rotulo: c.status, cor: "bg-hu-soft text-hu-text" }
                  return (
                    <li key={c.id} className="rounded-2xl border-4 border-hu-soft bg-hu-panel p-4 text-hu-text opacity-70">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold">{nomeProduto(c.produto_id)}</p>
                          <p className="mt-1 text-sm text-hu-muted">
                            🌱 {fmt(c.data_plantio)}
                            {c.data_colheita_real
                              ? ` · 🧺 colhido em ${fmt(c.data_colheita_real)}`
                              : ` · 🧺 previsão ${fmt(c.previsao_colheita)}`}
                            {c.quantidade ? ` · ${c.quantidade} un.` : ""}
                          </p>
                          {c.status === "PERDIDO" && rotuloMotivo(c.motivo_perda) && (
                            <p className="mt-1 text-sm text-hu-muted">
                              {rotuloMotivo(c.motivo_perda)}
                              {c.perdido_em ? ` · ${fmt(c.perdido_em)}` : ""}
                              {c.observacao_perda ? ` — ${c.observacao_perda}` : ""}
                            </p>
                          )}
                        </div>
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${status.cor}`}>
                          {status.rotulo}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}

      {atualizar.isError && (
        <Aviso variante="erro" className="mt-4">
          {atualizar.error.message}
        </Aviso>
      )}
    </div>
  )
}
