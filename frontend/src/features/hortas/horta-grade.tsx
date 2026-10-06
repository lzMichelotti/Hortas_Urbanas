import { useMe } from "@/features/auth/use-me"
import { useProdutividade } from "@/features/canteiros/use-produtividade"
import { BANDEIRA_INFO, bandeiraDoCanteiro } from "@/features/canteiros/bandeira"
import { BandeiraPixel } from "@/features/canteiros/bandeira-pixel"
import { TERRA } from "@/features/canteiro/terra"
import { Carregando, FalhaAoCarregar } from "@/components/feedback"
import type { components } from "@/lib/api/schema"

type Produtividade = components["schemas"]["ProdutividadeCanteiro"]

// Placa fincada na terra — é o mesmo número que está pregado no canteiro de verdade.
function Placa({ numero }: { numero: number }) {
  return (
    <span aria-hidden className="flex shrink-0 flex-col items-center">
      <span className="rounded-[3px] border-[3px] border-[#5b3a1a] bg-[#8a5a2b] px-2 py-1 shadow-[0_2px_0_rgba(0,0,0,.35)]">
        <span className="font-pixel text-[11px] leading-none text-[#ffe8c2]">{numero}</span>
      </span>
      <span className="h-2 w-1.5 bg-[#5b3a1a]" />
    </span>
  )
}

function estadoDasPlantas(c: Produtividade): string {
  if (c.prontas > 0) return `🧺 ${c.prontas} pronta${c.prontas > 1 ? "s" : ""}`
  if (c.crescendo > 0) return `🌱 ${c.crescendo} crescendo`
  if (c.plantadas > 0) return `${c.plantadas} plantada${c.plantadas > 1 ? "s" : ""}`
  return "sem plantas"
}

const celulaClasse =
  "flex w-full flex-col items-center gap-1 rounded-lg bg-black/30 px-2 py-2 text-center"

function Celula({ c, aoTocar }: { c: Produtividade; aoTocar?: (id: number) => void }) {
  const band = bandeiraDoCanteiro(c)
  const info = BANDEIRA_INFO[band]
  const responsavel = c.responsavel ? c.responsavel.split(" ")[0] : "sem dono"

  const conteudo = (
    <>
      <span className="flex max-w-full items-end gap-1.5">
        <Placa numero={c.numero} />
        <BandeiraPixel bandeira={band} />
        <span className="sr-only">{info.rotulo}</span>
      </span>
      <span className="max-w-full truncate text-sm font-bold text-white">{c.identificacao}</span>
      <span
        className={`max-w-full truncate text-[11px] ${c.responsavel == null ? "italic text-white/60" : "text-white/85"}`}
      >
        {responsavel}
      </span>
      <span
        className={`max-w-full truncate rounded px-1.5 text-[11px] font-bold text-white ${
          c.prontas > 0 ? "bg-amber-500/90" : "bg-black/45"
        }`}
      >
        {estadoDasPlantas(c)}
      </span>
    </>
  )

  if (!aoTocar) return <div className={celulaClasse}>{conteudo}</div>

  return (
    <button
      type="button"
      onClick={() => aoTocar(c.canteiro_id)}
      aria-label={`Canteiro ${c.numero}, ${c.identificacao}. ${info.rotulo}. Toque para ver os dados.`}
      className={`${celulaClasse} transition-transform hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/60`}
    >
      {conteudo}
    </button>
  )
}

export function HortaGrade({ aoTocar }: { aoTocar?: (id: number) => void }) {
  const me = useMe()
  const produtividade = useProdutividade(me.data?.horta_id ?? null)

  if (me.isPending || produtividade.isPending) return <Carregando />
  if (produtividade.isLoadingError) {
    return <FalhaAoCarregar />
  }

  const lista = produtividade.data ?? []

  return (
    <div
      className="grid grid-cols-2 gap-2 rounded-2xl border-[6px] border-[#5b3a1a] p-3 shadow-inner [image-rendering:pixelated] sm:grid-cols-3"
      style={TERRA}
    >
      {lista.map((c) => (
        <Celula key={c.canteiro_id} c={c} aoTocar={aoTocar} />
      ))}
    </div>
  )
}
