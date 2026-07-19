import { Sprout, TreeDeciduous, Wheat } from "lucide-react"
import { useMe } from "@/features/auth/use-me"
import { useProdutividade } from "@/features/canteiros/use-produtividade"
import { Voltar } from "@/components/voltar"
import { Aviso, Carregando, EstadoVazio } from "@/components/feedback"
import type { components } from "@/lib/api/schema"

type Produtividade = components["schemas"]["ProdutividadeCanteiro"]

function Fase({
  icone: Icone,
  valor,
  rotulo,
}: {
  icone: typeof Sprout
  valor: number
  rotulo: string
}) {
  const ativo = valor > 0
  return (
    <div className={`flex items-center gap-1.5 ${ativo ? "text-hu-text" : "text-hu-muted/60"}`}>
      <Icone className={`size-4 shrink-0 ${ativo ? "text-hu-bright" : ""}`} aria-hidden />
      <span className="font-pixel text-sm">{valor}</span>
      <span className="text-xs">{rotulo}</span>
    </div>
  )
}

function CartaoCanteiro({ c }: { c: Produtividade }) {
  return (
    <li className="rounded-2xl border-4 border-hu-bright bg-hu-panel p-4 text-hu-text">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 className="font-bold">{c.identificacao}</h2>
        <p className="text-sm text-hu-muted">{c.responsavel ?? "sem responsável"}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-hu-soft/40 pt-3">
        <Fase icone={Sprout} valor={c.plantadas} rotulo="plantadas" />
        <Fase icone={TreeDeciduous} valor={c.crescendo} rotulo="crescendo" />
        <Fase icone={Wheat} valor={c.prontas} rotulo="prontas" />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <p>
          🧺 Colhido:{" "}
          <span className="font-bold text-hu-golden">{c.colhido_total} un.</span>
          {c.colheitas > 0 && (
            <span className="text-hu-muted"> · {c.colheitas} colheita{c.colheitas > 1 ? "s" : ""}</span>
          )}
        </p>
        {c.perdas > 0 && (
          <p className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-red-200">
            {c.perdas} perdida{c.perdas > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </li>
  )
}

export function ProdutividadePage() {
  const me = useMe()
  const hortaId = me.data?.horta_id ?? null
  const produtividade = useProdutividade(hortaId)

  if (me.isPending || produtividade.isPending) return <Carregando />

  if (produtividade.isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <Aviso variante="erro" className="mt-6" aoTentarNovamente={() => produtividade.refetch()}>
          Não foi possível carregar a produtividade. Veja sua internet e tente de novo.
        </Aviso>
      </div>
    )
  }

  const canteiros = produtividade.data ?? []

  return (
    <div className="mx-auto max-w-2xl pb-2">
      <Voltar />
      <h1 className="mt-4 font-pixel text-sm text-hu-bright">Produtividade dos canteiros</h1>

      {canteiros.length === 0 ? (
        <EstadoVazio ilustracao="/personagem-idoso.webp">
          Nenhum canteiro ainda. Crie canteiros em <strong>Membros</strong> para acompanhar a produção.
        </EstadoVazio>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {canteiros.map((c) => (
            <CartaoCanteiro key={c.canteiro_id} c={c} />
          ))}
        </ul>
      )}
    </div>
  )
}
