import { type FormEvent, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { useMe } from "@/features/auth/use-me"
import { useDemandas, useCriarDemanda, useAtualizarStatusDemanda, useDeletarDemanda } from "@/features/demandas/use-demandas"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { components } from "@/lib/api/schema"
import { Aviso, Carregando } from "@/components/feedback"
import { ConfirmacaoInline } from "@/components/confirmar"

type StatusDemanda = components["schemas"]["StatusDemanda"]

const STATUS_CONFIG: Record<StatusDemanda, { rotulo: string; cor: string }> = {
  ABERTA: { rotulo: "Aguardando", cor: "bg-amber-400 text-black" },
  EM_ATENDIMENTO: { rotulo: "Em andamento", cor: "bg-hu-bright text-hu-bg" },
  ATENDIDA: { rotulo: "Concluída ✓", cor: "bg-white text-hu-bg" },
  CANCELADA: { rotulo: "Cancelada", cor: "bg-red-500 text-white" },
}

export function DemandasPage() {
  const me = useMe()
  const demandas = useDemandas()
  const criar = useCriarDemanda(me.data?.horta_id ?? 0)
  const cancelar = useAtualizarStatusDemanda(me.data?.horta_id ?? 0)
  const deletar = useDeletarDemanda()

  const [mostraForm, setMostraForm] = useState(false)
  const [confirmarExcluirId, setConfirmarExcluirId] = useState<number | null>(null)
  const [tipo, setTipo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [quantidade, setQuantidade] = useState("")
  const [unidade, setUnidade] = useState("")

  function resetForm() {
    setTipo("")
    setDescricao("")
    setQuantidade("")
    setUnidade("")
    setMostraForm(false)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tipo.trim() || !descricao.trim() || !quantidade || !unidade.trim()) return
    criar.mutate(
      {
        tipo_demanda: tipo.trim(),
        descricao: descricao.trim(),
        quantidade: Number(quantidade),
        unidade_medida: unidade.trim(),
        status: "ABERTA",
      },
      { onSuccess: resetForm },
    )
  }

  if (me.isPending || demandas.isPending) {
    return <Carregando />
  }

  const proprias = (demandas.data ?? []).filter((d) => d.canteiro_id == null)
  const ativas = proprias.filter(
    (d) => d.status !== "ATENDIDA" && d.status !== "CANCELADA",
  )
  const concluidas = proprias.filter(
    (d) => d.status === "ATENDIDA" || d.status === "CANCELADA",
  )

  return (
    <div className="mx-auto max-w-2xl">
      <Voltar />
      <div className="mt-4 flex items-center justify-between gap-3">
        <h1 className="font-pixel text-sm text-hu-bright">Demandas</h1>
        {!mostraForm && (
          <Button
            onClick={() => setMostraForm(true)}
            className="flex items-center gap-2 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
          >
            <Plus className="size-4" aria-hidden />
            Nova demanda
          </Button>
        )}
      </div>

      {mostraForm && (
        <form
          onSubmit={onSubmit}
          className="mt-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5 text-hu-text"
        >
          <p className="mb-4 font-pixel text-xs text-hu-text">Nova demanda</p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tipo" className="text-sm text-hu-text">O que é necessário?</Label>
            <Input
              id="tipo"
              placeholder="Ex: Sementes, Ferramentas, Adubo..."
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              required
              className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
            />
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            <Label htmlFor="desc" className="text-sm text-hu-text">Descrição</Label>
            <Input
              id="desc"
              placeholder="Ex: Sementes de tomate para o próximo plantio"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qtd" className="text-sm text-hu-text">Quantidade</Label>
              <Input
                id="qtd"
                type="number"
                min="0.1"
                step="0.1"
                placeholder="Ex: 5"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                required
                className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unid" className="text-sm text-hu-text">Unidade</Label>
              <Input
                id="unid"
                placeholder="Ex: kg, sacos, unidades"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                required
                className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
              />
            </div>
          </div>

          {criar.isError && (
            <Aviso variante="erro" className="mt-3">
              {criar.error.message}
            </Aviso>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              type="submit"
              disabled={!tipo.trim() || !descricao.trim() || !quantidade || !unidade.trim() || criar.isPending}
              className="h-11 flex-1 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
            >
              {criar.isPending ? "Enviando…" : "Enviar pedido"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              className="h-11 rounded-xl border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {proprias.length === 0 && !mostraForm && (
        <p className="mt-6 rounded-2xl border-4 border-hu-bright bg-hu-panel p-8 text-center text-hu-text">
          Nenhuma demanda registrada.
        </p>
      )}

      {ativas.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {ativas.map((d) => {
            const cfg = STATUS_CONFIG[d.status]
            const cancelandoEste = cancelar.isPending && cancelar.variables?.demandaId === d.id
            const deletandoEste = deletar.isPending && deletar.variables === d.id

            return (
              <li
                key={d.id}
                className="rounded-2xl border-4 border-hu-bright bg-hu-panel p-4 text-hu-text"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{d.tipo_demanda}</p>
                    <p className="mt-0.5 text-sm text-hu-text/80">{d.descricao}</p>
                    <p className="mt-1 text-sm text-hu-muted">
                      {d.quantidade} {d.unidade_medida}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${cfg.cor}`}>
                    {cfg.rotulo}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelar.mutate({ demandaId: d.id, status: "CANCELADA" })}
                    disabled={cancelar.isPending || deletar.isPending}
                    className="rounded-lg border-red-400/50 bg-transparent text-sm text-red-600 hover:bg-red-500/15"
                  >
                    {cancelandoEste ? "Cancelando…" : "Cancelar pedido"}
                  </Button>
                  <button
                    onClick={() => setConfirmarExcluirId(confirmarExcluirId === d.id ? null : d.id)}
                    disabled={deletar.isPending || cancelar.isPending}
                    aria-expanded={confirmarExcluirId === d.id}
                    className="ml-auto rounded-lg flex size-11 items-center justify-center border border-red-400/40 text-red-600 hover:bg-red-500/15 disabled:opacity-50"
                    aria-label={`Excluir ${d.tipo_demanda}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>

                {confirmarExcluirId === d.id && (
                  <ConfirmacaoInline
                    pergunta={<>Excluir o pedido <strong>{d.tipo_demanda}</strong>? Não dá pra desfazer.</>}
                    confirmando={deletandoEste}
                    aoConfirmar={() => deletar.mutate(d.id, { onSuccess: () => setConfirmarExcluirId(null) })}
                    aoCancelar={() => setConfirmarExcluirId(null)}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}

      {(cancelar.isError || deletar.isError) && (
        <Aviso variante="erro" className="mt-4">
          {cancelar.error?.message ?? deletar.error?.message}
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
                    <p className="font-bold">{d.tipo_demanda}</p>
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
