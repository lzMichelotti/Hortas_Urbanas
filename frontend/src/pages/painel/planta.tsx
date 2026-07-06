import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { useMeuCanteiro } from "@/features/canteiro/use-meu-canteiro"
import { useCiclos, useColher, useAtualizarStatusCiclo } from "@/features/ciclos/use-ciclos"
import { diasRestantes, estagioDe, progresso } from "@/features/ciclos/crescimento"
import { useProdutos } from "@/features/produtos/use-produtos"
import { formatarEpoca } from "@/features/produtos/colheita"
import { Voltar } from "@/components/voltar"
import { ArtePlanta } from "@/features/produtos/sprite-produto"
import { FalaDaGuia } from "@/components/guia"
import { CelebracaoOverlay } from "@/components/celebracao"
import { ConfirmacaoInline } from "@/components/confirmar"
import { Aviso, Carregando } from "@/components/feedback"
import { Button } from "@/components/ui/button"
import type { components } from "@/lib/api/schema"

type StatusCiclo = components["schemas"]["StatusCiclo"]
type Produto = components["schemas"]["ProdutoRead"]

const fmt = (d: string) => d.split("-").reverse().join("/")

const SELO: Partial<Record<StatusCiclo, { rotulo: string; cor: string }>> = {
  PLANTADO: { rotulo: "Plantado", cor: "bg-hu-soft text-hu-text" },
  EM_CRESCIMENTO: { rotulo: "Crescendo", cor: "bg-hu-bright text-hu-bg" },
  PRONTO_PARA_COLHEITA: { rotulo: "Pronto pra colher", cor: "bg-amber-400 text-black" },
}

const PROXIMO: Partial<Record<StatusCiclo, { status: StatusCiclo; rotulo: string }>> = {
  PLANTADO: { status: "EM_CRESCIMENTO", rotulo: "Está crescendo" },
  EM_CRESCIMENTO: { status: "PRONTO_PARA_COLHEITA", rotulo: "Pronto pra colher" },
}

function dicaDoProduto(p?: Produto): string | null {
  if (!p) return null
  const partes: string[] = []
  partes.push(p.da_em_arvore ? "É de árvore: a primeira colheita costuma demorar mais." : "Regue de manhã cedo ou no fim da tarde.")
  const epoca = formatarEpoca(p.epoca_recomendada)
  if (epoca) partes.push(`Melhor época de plantio: ${epoca}.`)
  return partes.join(" ")
}

export function PlantaDetalhePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const canteiro = useMeuCanteiro()
  const ciclos = useCiclos(canteiro.data?.id)
  const produtos = useProdutos()
  const colher = useColher(canteiro.data?.id ?? 0)
  const atualizar = useAtualizarStatusCiclo(canteiro.data?.id ?? 0)
  const [confirmarPerda, setConfirmarPerda] = useState(false)
  const [colhido, setColhido] = useState(false)

  if (canteiro.isPending || ciclos.isPending) return <Carregando />

  const ciclo = (ciclos.data ?? []).find((c) => c.id === Number(id))
  if (!ciclo) {
    return (
      <div className="mx-auto max-w-md">
        <Voltar />
        <p className="mt-6 rounded-2xl border-4 border-hu-bright bg-hu-panel p-8 text-center text-hu-text">
          Esta planta não está mais no seu canteiro.
        </p>
      </div>
    )
  }

  const produto = produtos.data?.find((p) => p.id === ciclo.produto_id)
  const nome = produto?.nome ?? (ciclo.produto_id != null ? `#${ciclo.produto_id}` : "Planta")
  const selo = SELO[ciclo.status] ?? { rotulo: ciclo.status, cor: "bg-hu-soft text-hu-text" }
  const pct = Math.round(progresso(ciclo) * 100)
  const dias = diasRestantes(ciclo)
  const colhivel = ciclo.status === "PRONTO_PARA_COLHEITA" || pct >= 100
  const proximo = PROXIMO[ciclo.status]
  const dica = dicaDoProduto(produto)
  const ocupado = atualizar.isPending || colher.isPending

  return (
    <div className="mx-auto max-w-md">
      <Voltar />

      <section className="mt-4 flex items-center gap-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-4 text-hu-text">
        <ArtePlanta nome={nome} estagio={estagioDe(ciclo)} className="size-16 shrink-0" />
        <div className="min-w-0">
          <h1 className="font-pixel text-sm text-hu-bright">{nome}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${selo.cor}`}>{selo.rotulo}</span>
            {ciclo.quantidade ? (
              <span className="text-sm text-hu-muted">{ciclo.quantidade} unidades previstas</span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-4 text-hu-text">
        <div className="flex items-end justify-between text-xs font-bold">
          <span>🌱 Plantado</span>
          <span>🧺 Colheita</span>
        </div>
        <div className="relative mt-2 h-3 rounded-full bg-black/15">
          <div className="h-full rounded-full bg-hu-bright" style={{ width: `${pct}%` }} />
          <span
            aria-hidden
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-hu-bright"
            style={{ left: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-hu-muted">
          <span>{fmt(ciclo.data_plantio)}</span>
          <span>{fmt(ciclo.previsao_colheita)}</span>
        </div>
        <p className="mt-3 text-center text-sm font-bold">
          {dias > 0 ? `Faltam ~${dias} dia${dias > 1 ? "s" : ""}` : "Colheita chegou! 🧺"}
        </p>
      </section>

      <section className="mt-4 flex flex-col gap-3">
        {colhivel && (
          <Button
            onClick={() => colher.mutate(ciclo.id, { onSuccess: () => setColhido(true) })}
            disabled={ocupado}
            className="h-14 rounded-xl bg-amber-500 text-base font-bold text-black hover:bg-amber-500/90"
          >
            🧺 {colher.isPending ? "Salvando…" : "Marcar como colhida"}
          </Button>
        )}
        {proximo && (
          <Button
            onClick={() => atualizar.mutate({ id: ciclo.id, status: proximo.status })}
            disabled={ocupado}
            variant={colhivel ? "outline" : "default"}
            className={
              colhivel
                ? "h-12 rounded-xl border-hu-bright bg-transparent text-hu-text hover:bg-black/5"
                : "h-14 rounded-xl bg-hu-bright text-base font-bold text-hu-bg hover:bg-hu-bright/90"
            }
          >
            ✓ {atualizar.isPending ? "Atualizando…" : proximo.rotulo}
          </Button>
        )}

        {!confirmarPerda ? (
          <button
            type="button"
            onClick={() => setConfirmarPerda(true)}
            disabled={ocupado}
            className="mt-1 self-center rounded text-sm text-hu-muted underline underline-offset-4 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            A planta se perdeu?
          </button>
        ) : (
          <ConfirmacaoInline
            pergunta={<>Marcar <strong>{nome}</strong> como perdida? Não dá pra desfazer.</>}
            rotuloConfirmar="Sim, perdeu-se"
            rotuloConfirmando="Salvando…"
            confirmando={atualizar.isPending}
            aoConfirmar={() => atualizar.mutate({ id: ciclo.id, status: "PERDIDO" }, { onSuccess: () => navigate("/painel") })}
            aoCancelar={() => setConfirmarPerda(false)}
          />
        )}
      </section>

      {dica && (
        <section className="mt-4">
          <FalaDaGuia>{dica}</FalaDaGuia>
        </section>
      )}

      {(atualizar.isError || colher.isError) && (
        <Aviso variante="erro" className="mt-4">
          Não foi possível salvar agora. Veja sua internet e tente de novo.
        </Aviso>
      )}

      {colhido && <CelebracaoOverlay nome={nome} variante="colheita" onDismiss={() => navigate("/painel")} />}
    </div>
  )
}
