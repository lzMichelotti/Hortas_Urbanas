import { Dialog } from "radix-ui"
import { LogOut } from "lucide-react"
import { useLogout } from "@/features/auth/use-logout"
import { RostoGuia } from "@/components/guia"

// Confirmação de logout compartilhada (menu do avatar e Configurações): a jardineira
// pergunta em retrato, como se estivesse falando. z-[1200] p/ ficar acima do QuadroMenu.
export function ConfirmarSair({ aberta, aoMudar }: { aberta: boolean; aoMudar: (v: boolean) => void }) {
  const logout = useLogout()

  return (
    <Dialog.Root open={aberta} onOpenChange={aoMudar}>
      <Dialog.Portal>
        <Dialog.Overlay className="hu-folha-overlay fixed inset-0 z-[1200] bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="hu-pop fixed left-1/2 top-1/2 z-[1200] w-[88vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5 text-hu-text shadow-[0_8px_0_rgba(0,0,0,.3)]"
        >
          <div className="flex items-center gap-3">
            <RostoGuia className="size-16 drop-shadow-[0_2px_0_rgba(0,0,0,.2)]" />
            <Dialog.Title className="text-lg font-bold leading-snug">Quer mesmo sair do aplicativo?</Dialog.Title>
          </div>

          <div className="mt-5 flex gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="min-h-12 flex-1 rounded-xl border-2 border-hu-soft bg-transparent text-base font-bold text-hu-text transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
              >
                Ficar
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={logout}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-red-400/50 text-base font-bold text-red-600 transition-colors hover:bg-red-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <LogOut className="size-5" aria-hidden />
              Sair
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
