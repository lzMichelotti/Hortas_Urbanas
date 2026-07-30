import { useState } from "react"
import { Link } from "react-router"
import { Dialog } from "radix-ui"
import { Maximize2, X } from "lucide-react"
import { useMe } from "@/features/auth/use-me"
import { useProdutividade } from "@/features/canteiros/use-produtividade"
import { HortaGrade } from "@/features/hortas/horta-grade"
import { FolhaCanteiro } from "@/features/hortas/folha-canteiro"
import { DetalhesDaHorta } from "@/features/hortas/detalhes-horta"
import { MolduraCanteiro } from "@/features/canteiro/decoracoes"
import { Aviso, Carregando } from "@/components/feedback"

export function HortaVitrine() {
  const [aberto, setAberto] = useState(false)
  const [abertoId, setAbertoId] = useState<number | null>(null)

  const me = useMe()
  const produtividade = useProdutividade(me.data?.horta_id ?? null)
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
  const aberta = lista.find((c) => c.canteiro_id === abertoId) ?? null

  return (
    <Dialog.Root open={aberto} onOpenChange={setAberto}>
      <div className="relative mx-auto w-full max-w-md">
        <div
          aria-hidden
          className="pointer-events-none max-h-[46svh] overflow-hidden rounded-2xl opacity-90 blur-[2px]"
        >
          <MolduraCanteiro>
            <HortaGrade />
          </MolduraCanteiro>
        </div>

        <Dialog.Trigger asChild>
          <button
            aria-label="Ver minha horta em tela cheia"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/15 transition-colors hover:bg-black/25 active:bg-black/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/70"
          >
            <span className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#5b3a1a] bg-hu-panel px-4 py-2.5 text-center font-pixel text-[11px] leading-tight text-hu-text shadow-[0_3px_0_#5b3a1a]">
              <Maximize2 className="size-4 shrink-0 text-hu-bright" aria-hidden />
              Ver minha horta
            </span>
          </button>
        </Dialog.Trigger>

        {totalProntas > 0 && (
          <span className="pointer-events-none absolute right-1 top-1 rounded-full border-2 border-white bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
            🧺 {totalProntas} pronta{totalProntas > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="hu-folha-overlay fixed inset-0 z-[1200] bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[1200] flex flex-col bg-hu-bg"
        >
          <header className="flex items-center justify-between border-b-4 border-hu-bright bg-hu-panel px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <Dialog.Title className="font-pixel text-sm text-hu-bright">Minha horta</Dialog.Title>
            <Dialog.Close
              aria-label="Fechar"
              className="flex size-11 items-center justify-center rounded-lg text-hu-text hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-2xl">
              <MolduraCanteiro etiqueta="Minha horta">
                <HortaGrade aoTocar={setAbertoId} />
              </MolduraCanteiro>
              <p className="mt-3 text-center text-sm text-hu-muted">
                Toque num canteiro para ver o que está acontecendo nele.
              </p>
              <DetalhesDaHorta aoNavegar={() => setAberto(false)} />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {/* Acima da tela cheia (z-1200), senão a folha abre atrás dela. */}
      <FolhaCanteiro canteiro={aberta} aoFechar={() => setAbertoId(null)} camada="z-[1300]" />
    </Dialog.Root>
  )
}
