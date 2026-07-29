import { useState } from "react"
import { useLocation } from "react-router"
import { Dialog } from "radix-ui"
import { Maximize2, X } from "lucide-react"
import { useMeuCanteiro } from "@/features/canteiro/use-meu-canteiro"
import { useCiclos } from "@/features/ciclos/use-ciclos"
import { estagioDe } from "@/features/ciclos/crescimento"
import { CanteiroGrade } from "@/features/canteiro/horta-interativa"
import { MolduraCanteiro } from "@/features/canteiro/decoracoes"

export function CanteiroVitrine() {
  const location = useLocation()
  const [aberto, setAberto] = useState(
    () => Boolean((location.state as { abrirCanteiro?: boolean } | null)?.abrirCanteiro),
  )
  const canteiro = useMeuCanteiro()
  const ciclos = useCiclos(canteiro.data?.id)
  const prontas = (ciclos.data ?? []).filter((c) => estagioDe(c) === "pronta").length

  return (
    <Dialog.Root open={aberto} onOpenChange={setAberto}>
      <div className="relative mx-auto w-full max-w-md">
        <div
          aria-hidden
          className="pointer-events-none max-h-[46svh] overflow-hidden rounded-2xl opacity-90 blur-[2px]"
        >
          <MolduraCanteiro>
            <CanteiroGrade interativo={false} />
          </MolduraCanteiro>
        </div>

        <Dialog.Trigger asChild>
          <button
            aria-label="Abrir meu canteiro em tela cheia"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/15 transition-colors hover:bg-black/25 active:bg-black/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/70"
          >
            <span className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#5b3a1a] bg-hu-panel px-4 py-2.5 text-center font-pixel text-[11px] leading-tight text-hu-text shadow-[0_3px_0_#5b3a1a]">
              <Maximize2 className="size-4 shrink-0 text-hu-bright" aria-hidden />
              Abrir meu canteiro
            </span>
          </button>
        </Dialog.Trigger>

        {prontas > 0 && (
          <span className="pointer-events-none absolute right-1 top-1 rounded-full border-2 border-white bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
            🧺 {prontas} pronta{prontas > 1 ? "s" : ""}
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
            <Dialog.Title className="font-pixel text-sm text-hu-bright">Meu canteiro</Dialog.Title>
            <Dialog.Close
              aria-label="Fechar"
              className="flex size-11 items-center justify-center rounded-lg text-hu-text hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-2xl">
              <MolduraCanteiro etiqueta="Meu canteiro">
                <CanteiroGrade interativo minBlocos={9} />
              </MolduraCanteiro>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
