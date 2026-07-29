import { Link } from "react-router"
import { Maximize2 } from "lucide-react"
import { useMe } from "@/features/auth/use-me"
import { useProdutividade } from "@/features/canteiros/use-produtividade"
import { BANDEIRA_INFO, bandeiraDoCanteiro } from "@/features/canteiros/bandeira"
import { BandeiraPixel } from "@/features/canteiros/bandeira-pixel"
import { TERRA } from "@/features/canteiro/terra"
import { Aviso, Carregando } from "@/components/feedback"

export function HortaVitrine() {
  const me = useMe()
  const hortaId = me.data?.horta_id ?? null
  const produtividade = useProdutividade(hortaId)
  const lista = produtividade.data ?? []

  if (me.isPending || produtividade.isPending) return <Carregando />
  if (produtividade.isError) {
    return (
      <Aviso variante="erro" aoTentarNovamente={() => produtividade.refetch()}>
        Não foi possível carregar sua horta. Veja sua internet e tente de novo.
      </Aviso>
    )
  }

  if (lista.length === 0) {
    return (
      <div className="rounded-2xl border-4 border-hu-bright bg-hu-panel p-6 text-center text-hu-text">
        <p>Sua horta ainda não tem canteiros.</p>
        <Link
          to="/painel/membros"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[#5b3a1a] bg-hu-bright px-4 font-pixel text-xs leading-tight text-hu-bg shadow-[0_3px_0_#5b3a1a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
        >
          Criar canteiros
        </Link>
      </div>
    )
  }

  const totalProntas = lista.reduce((soma, c) => soma + c.prontas, 0)

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden
        className="pointer-events-none overflow-hidden rounded-2xl opacity-90 blur-[2px]"
      >
        <div className="rounded-2xl border-[6px] border-[#5b3a1a] p-3 shadow-inner [image-rendering:pixelated]" style={TERRA}>
          <div className="grid grid-cols-2 gap-2">
            {lista.map((c) => {
              const band = bandeiraDoCanteiro(c)
              const info = BANDEIRA_INFO[band]
              const responsavel = c.responsavel ? c.responsavel.split(" ")[0] : "vazio"
              return (
                <div key={c.canteiro_id} className="flex flex-col items-center gap-0.5 rounded-lg bg-black/30 px-2 py-2">
                  <span className="flex w-full items-center justify-center gap-1">
                    <BandeiraPixel bandeira={band} />
                    <span className="sr-only">{info.rotulo}</span>
                    <span className="truncate text-sm font-bold text-white">{c.identificacao}</span>
                  </span>
                  <span className={`text-[11px] ${c.responsavel == null ? "italic text-white/60" : "text-white/85"}`}>
                    {responsavel}
                  </span>
                  <span
                    className={`rounded px-1.5 text-[11px] font-bold text-white ${
                      c.prontas > 0 ? "bg-amber-500/90" : "bg-black/45"
                    }`}
                  >
                    {c.prontas > 0
                      ? `🧺 ${c.prontas} pronta${c.prontas > 1 ? "s" : ""}`
                      : c.crescendo > 0
                        ? `🌱 ${c.crescendo} crescendo`
                        : "sem plantas"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Link
        to="/painel/horta"
        aria-label="Ver minha horta em tela cheia"
        className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/15 transition-colors hover:bg-black/25 active:bg-black/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/70"
      >
        <span className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#5b3a1a] bg-hu-panel px-4 py-2.5 text-center font-pixel text-xs leading-tight text-hu-text shadow-[0_3px_0_#5b3a1a]">
          <Maximize2 className="size-4 shrink-0 text-hu-bright" aria-hidden />
          Ver minha horta
        </span>
      </Link>

      {totalProntas > 0 && (
        <span className="pointer-events-none absolute right-1 top-1 rounded-full border-2 border-white bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
          🧺 {totalProntas} pronta{totalProntas > 1 ? "s" : ""}
        </span>
      )}
    </div>
  )
}
