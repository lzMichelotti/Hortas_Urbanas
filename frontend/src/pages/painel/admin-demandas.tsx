import { useDemandas, useAtualizarStatusDemandaAdmin } from "@/features/demandas/use-demandas"
import { useHortas } from "@/features/hortas/use-hortas"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import type { components } from "@/lib/api/schema"
import { Aviso, Carregando } from "@/components/feedback"

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

export function AdminDemandasPage() {
  const demandas = useDemandas()
  const hortas = useHortas()
  const atualizar = useAtualizarStatusDemandaAdmin()

  const nomeHorta = (id: number) =>
    hortas.data?.find((h) => h.id === id)?.nome ?? `Horta #${id}`

  if (demandas.isPending || hortas.isPending) {
    return <Carregando />
  }

  const abertas = (demandas.data ?? []).filter(
    (d) => d.status === "ABERTA" || d.status === "EM_ATENDIMENTO",
  )
  const concluidas = (demandas.data ?? []).filter(
    (d) => d.status === "ATENDIDA" || d.status === "CANCELADA",
  )

  return (
    <div className="mx-auto max-w-2xl">
      <Voltar />
      <h1 className="mt-4 font-pixel text-sm text-hu-bright">Demandas das hortas</h1>

      {(demandas.data ?? []).length === 0 && (
        <p className="mt-6 rounded-2xl border-4 border-hu-bright bg-hu-panel p-8 text-center text-hu-text">
          Nenhuma demanda registrada pelas hortas.
        </p>
      )}

      {abertas.length > 0 && (
        <>
          {abertas.filter((d) => d.status === "ABERTA").length > 0 && (
            <p className="mt-5 font-pixel text-xs text-amber-400">
              {abertas.filter((d) => d.status === "ABERTA").length} aguardando atendimento
            </p>
          )}
          <ul className="mt-3 flex flex-col gap-3">
            {abertas.map((d) => {
              const cfg = STATUS_CONFIG[d.status]
              const proximoStatus = PROXIMO[d.status]
              const rotuloProximo = ROTULO_PROXIMO[d.status]
              const atualizandoEste =
                atualizar.isPending && atualizar.variables?.demandaId === d.id

              return (
                <li
                  key={d.id}
                  className={`rounded-2xl border-4 bg-hu-panel p-4 text-hu-text ${
                    d.status === "ABERTA" ? "border-amber-400/60" : "border-hu-bright"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-hu-text">
                        {nomeHorta(d.horta_id)}
                      </p>
                      <p className="mt-0.5 font-bold">{d.tipo_demanda}</p>
                      <p className="mt-0.5 text-sm text-hu-text/80">{d.descricao}</p>
                      <p className="mt-1 text-sm text-hu-muted">
                        {d.quantidade} {d.unidade_medida}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${cfg.cor}`}>
                      {cfg.rotulo}
                    </span>
                  </div>

                  {proximoStatus && rotuloProximo && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        onClick={() =>
                          atualizar.mutate({
                            hortaId: d.horta_id,
                            demandaId: d.id,
                            status: proximoStatus,
                          })
                        }
                        disabled={atualizar.isPending}
                        className="rounded-lg bg-hu-bright text-sm font-bold text-hu-bg hover:bg-hu-bright/90"
                      >
                        {atualizandoEste ? "Atualizando…" : `✓ ${rotuloProximo}`}
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {atualizar.isError && (
        <Aviso variante="erro" className="mt-4">
          {atualizar.error.message}
        </Aviso>
      )}

      {concluidas.length > 0 && (
        <section className="mt-6">
          <p className="mb-3 font-pixel text-xs text-hu-muted">Histórico</p>
          <ul className="flex flex-col gap-3">
            {concluidas.map((d) => {
              const cfg = STATUS_CONFIG[d.status]
              return (
                <li
                  key={d.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border-4 border-hu-soft bg-hu-panel p-4 text-hu-text opacity-70"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-hu-text">{nomeHorta(d.horta_id)}</p>
                    <p className="mt-0.5 font-bold">{d.tipo_demanda}</p>
                    <p className="mt-0.5 text-sm text-hu-muted">{d.descricao}</p>
                    <p className="mt-1 text-sm text-hu-muted">
                      {d.quantidade} {d.unidade_medida}
                    </p>
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
