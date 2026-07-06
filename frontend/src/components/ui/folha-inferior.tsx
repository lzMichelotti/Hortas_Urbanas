import type { ReactNode } from "react"
import { Dialog } from "radix-ui"
import { X } from "lucide-react"

// Folha inferior (bottom sheet) sobre Radix Dialog: foco preso, Esc e overlay
// para fechar. Usada só no mobile; no desktop os controles ficam em painéis
// flutuantes. Animação simples respeita prefers-reduced-motion (ver index.css).
export function FolhaInferior({
  aberta,
  aoMudar,
  titulo,
  gatilho,
  children,
}: {
  aberta?: boolean
  aoMudar?: (v: boolean) => void
  titulo: string
  gatilho?: ReactNode
  children: ReactNode
}) {
  return (
    <Dialog.Root open={aberta} onOpenChange={aoMudar}>
      {gatilho && <Dialog.Trigger asChild>{gatilho}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="hu-folha-overlay fixed inset-0 z-[1100] bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="hu-folha fixed inset-x-0 bottom-0 z-[1100] max-h-[85svh] overflow-auto rounded-t-2xl border-t-4 border-hu-bright bg-hu-panel p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-hu-text"
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-hu-bright/50" aria-hidden />
          <div className="mb-3 flex items-center justify-between gap-2">
            <Dialog.Title className="font-pixel text-xs text-hu-text">{titulo}</Dialog.Title>
            <Dialog.Close
              aria-label="Fechar"
              className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-hu-muted hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
