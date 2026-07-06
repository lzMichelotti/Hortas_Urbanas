import { Link } from "react-router"
import { Dialog } from "radix-ui"
import { X } from "lucide-react"
import { Guia } from "@/components/guia"

const OPCOES = [
  { label: "Plantar", img: "/plantar.png", to: "/painel/plantar" },
  { label: "Colher", img: "/colher.png", to: "/painel/colher" },
  { label: "Calendário", img: "/calendario.png", to: "/painel/calendario" },
  { label: "Mapa", img: "/mapa.png", to: "/mapa" },
]

const PREGO = "absolute size-1.5 rounded-full bg-[#3f2810]"

export function QuadroMenu({ aberta, aoMudar }: { aberta: boolean; aoMudar: (v: boolean) => void }) {
  return (
    <Dialog.Root open={aberta} onOpenChange={aoMudar}>
      <Dialog.Portal>
        <Dialog.Overlay className="hu-folha-overlay fixed inset-0 z-[1100] bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="hu-pop fixed left-1/2 top-1/2 z-[1100] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border-[5px] border-[#5b3a1a] bg-[#8a5a2b] p-5 shadow-[0_8px_0_rgba(0,0,0,.35)] dark:border-[#2a1a0c] dark:bg-[#553519]"
        >
          <span className={`${PREGO} left-2 top-2`} />
          <span className={`${PREGO} right-2 top-2`} />
          <span className={`${PREGO} bottom-2 left-2`} />
          <span className={`${PREGO} bottom-2 right-2`} />

          <div className="mb-5 flex items-center gap-3">
            <Guia humor="feliz" className="size-12 shrink-0 drop-shadow-[0_2px_0_rgba(0,0,0,.3)]" />
            <Dialog.Title className="font-pixel text-xs leading-relaxed text-[#ffe8c2]">
              O que você precisa?
            </Dialog.Title>
            <Dialog.Close
              aria-label="Fechar"
              className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-lg text-[#ffe8c2] hover:bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe8c2]"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {OPCOES.map((o) => (
              <Dialog.Close asChild key={o.to}>
                <Link
                  to={o.to}
                  className="flex flex-col items-center gap-2 rounded-xl border-4 border-[#5b3a1a] bg-hu-panel p-4 text-center transition-transform hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/60"
                >
                  <img src={o.img} alt="" className="size-12 [image-rendering:pixelated]" />
                  <span className="font-pixel text-[11px] leading-tight text-hu-text">{o.label}</span>
                </Link>
              </Dialog.Close>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
