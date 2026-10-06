import { type FormEvent, useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { useMe } from "@/features/auth/use-me"
import { useDemandas, useCriarDemanda, useAtualizarStatusDemanda, useDeletarDemanda } from "@/features/demandas/use-demandas"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { components } from "@/lib/api/schema"
import { Aviso, Carregando, EstadoVazio, TelaFalhaAoCarregar } from "@/components/feedback"
import { ConfirmacaoInline } from "@/components/confirmar"
import { DivisorCerca } from "@/components/divisor-cerca"
import { dataCurta } from "@/lib/tempo"

type StatusPedido = components["schemas"]["StatusPedido"]

const STATUS_CONFIG: Record<StatusPedido, { rotulo: string; chip: string }> = {
  ABERTA: {
    rotulo: "Aguardando",
    chip: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  },
  EM_ATENDIMENTO: {
    rotulo: "Em andamento",
    chip: "border-green-300 bg-green-100 text-green-800 dark:border-green-500/40 dark:bg-green-500/15 dark:text-green-200",
  },
  ATENDIDA: {
    rotulo: "Concluída ✓",
    chip: "border-hu-soft bg-hu-soft/20 text-hu-text",
  },
  CANCELADA: {
    rotulo: "Cancelada",
    chip: "border-red-300 bg-red-100 text-red-800 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200",
  },
}

const UNIDADES_COMUNS = ["kg", "unidades", "sacos", "litros", "metros", "pacotes", "caixas"]

const BOTAO_PIXEL =
  "rounded-xl border-2 border-[#5b3a1a] bg-hu-bright font-bold text-hu-bg shadow-[0_3px_0_#5b3a1a] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_#5b3a1a] disabled:pointer-events-none disabled:opacity-50"
const BOTAO_NEUTRO = "rounded-xl border-2 border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
const LIXEIRA =
  "flex size-11 shrink-0 items-center justify-center rounded-lg text-hu-muted hover:bg-red-500/15 hover:text-red-600 active:bg-red-500/15 active:text-red-600 disabled:opacity-50"

export function DemandasPage() {
  const me = useMe()
  const demandas = useDemandas()
  const criar = useCriarDemanda(me.data?.horta_id ?? 0)
  const cancelar = useAtualizarStatusDemanda(me.data?.horta_id ?? 0)
  const deletar = useDeletarDemanda()

  const idemRef = useRef("")

  const [mostraForm, setMostraForm] = useState(false)
  const [confirmarExcluirId, setConfirmarExcluirId] = useState<number | null>(null)
  const [confirmarCancelarId, setConfirmarCancelarId] = useState<number | null>(null)
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
    idemRef.current = ""
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tipo.trim() || !descricao.trim() || !quantidade || !unidade.trim()) return
    if (!idemRef.current) idemRef.current = crypto.randomUUID()
    criar.mutate(
      {
        body: {
          tipo_demanda: tipo.trim(),
          descricao: descricao.trim(),
          quantidade: Number(quantidade),
          unidade_medida: unidade.trim(),
        },
        idempotencyKey: idemRef.current,
      },
      { onSuccess: resetForm },
    )
  }

  function toggleConfirmarExcluir(id: number) {
    setConfirmarExcluirId((atual) => (atual === id ? null : id))
    setConfirmarCancelarId(null)
  }

  function toggleConfirmarCancelar(id: number) {
    setConfirmarCancelarId((atual) => (atual === id ? null : id))
    setConfirmarExcluirId(null)
  }

  if (me.isPending || demandas.isPending) {
    return <Carregando />
  }
  if (me.isLoadingError || demandas.isLoadingError) {
    return <TelaFalhaAoCarregar />
  }

  const proprias = (demandas.data ?? []).filter((d) => d.canteiro_id == null)
  const ativas = proprias.filter(
    (d) => d.status !== "ATENDIDA" && d.status !== "CANCELADA",
  )
  const concluidas = proprias.filter(
    (d) => d.status === "ATENDIDA" || d.status === "CANCELADA",
  )

  return (
    <div className="mx-auto max-w-2xl pb-4">
      <Voltar />

      <div className="mt-4">
        <h1 className="font-pixel text-sm text-hu-bright">Demandas</h1>
        {!mostraForm && (
          <Button
            onClick={() => setMostraForm(true)}
            className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 ${BOTAO_PIXEL}`}
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
                list="unidades-comuns"
                placeholder="Ex: kg, sacos, unidades"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                required
                className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
              />
              <datalist id="unidades-comuns">
                {UNIDADES_COMUNS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
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
              className={`h-11 flex-1 ${BOTAO_PIXEL}`}
            >
              {criar.isPending ? "Enviando…" : "Enviar pedido"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              className={`h-11 ${BOTAO_NEUTRO}`}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {proprias.length === 0 && !mostraForm && (
        <EstadoVazio ilustracao="/personagem-idoso.webp">
          Nenhuma demanda ainda. Peça materiais ou sementes em "Nova demanda".
        </EstadoVazio>
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
                className="rounded-2xl border-2 border-hu-soft bg-hu-panel p-4 text-hu-text"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{d.tipo_demanda}</p>
                    <p className="mt-0.5 text-sm text-hu-text/80">{d.descricao}</p>
                    <span className="mt-2 inline-flex w-fit items-center rounded-full border border-hu-soft bg-hu-soft/20 px-2.5 py-1 text-xs font-medium text-hu-text">
                      {d.quantidade} {d.unidade_medida}
                    </span>
                    <p className="mt-2 text-xs text-hu-muted">Pedido em {dataCurta(d.criado_em)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.chip}`}>
                    {cfg.rotulo}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-hu-soft/40 pt-3">
                  <button
                    onClick={() => toggleConfirmarCancelar(d.id)}
                    disabled={cancelar.isPending || deletar.isPending}
                    className="min-h-11 flex-1 rounded-lg border border-hu-soft px-3 text-sm text-hu-text hover:bg-black/5 disabled:opacity-50"
                  >
                    {cancelandoEste ? "Cancelando…" : "Cancelar pedido"}
                  </button>
                  <button
                    onClick={() => toggleConfirmarExcluir(d.id)}
                    disabled={deletar.isPending || cancelar.isPending}
                    aria-expanded={confirmarExcluirId === d.id}
                    className={LIXEIRA}
                    aria-label={`Excluir ${d.tipo_demanda}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>

                {confirmarCancelarId === d.id && (
                  <ConfirmacaoInline
                    pergunta={<>Cancelar o pedido de <strong>{d.tipo_demanda}</strong>?</>}
                    rotuloConfirmar="Sim, cancelar"
                    rotuloConfirmando="Cancelando…"
                    rotuloCancelar="Voltar"
                    confirmando={cancelandoEste}
                    aoConfirmar={() =>
                      cancelar.mutate(
                        { demandaId: d.id, status: "CANCELADA" },
                        { onSuccess: () => setConfirmarCancelarId(null) },
                      )
                    }
                    aoCancelar={() => setConfirmarCancelarId(null)}
                  />
                )}

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
        <>
          <DivisorCerca className="mt-6" />
          <section className="mt-4">
            <p className="mb-3 font-pixel text-xs text-hu-muted">Histórico</p>
            <ul className="flex flex-col gap-2">
              {concluidas.map((d) => {
                const cfg = STATUS_CONFIG[d.status]
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-hu-soft/60 bg-hu-panel px-3 py-2 text-hu-text opacity-70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.tipo_demanda}</p>
                      <p className="text-xs text-hu-muted">{d.quantidade} {d.unidade_medida}</p>
                      <p className="text-xs text-hu-muted">
                        Pedido em {dataCurta(d.criado_em)}
                        {d.finalizado_em && (
                          <>
                            {" · "}
                            {d.status === "ATENDIDA" ? "Concluída" : "Cancelada"} em {dataCurta(d.finalizado_em)}
                          </>
                        )}
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
    </div>
  )
}
