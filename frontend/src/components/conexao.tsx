import { useSyncExternalStore } from "react"
import { onlineManager, useMutationState } from "@tanstack/react-query"
import { useRegisterSW } from "virtual:pwa-register/react"
import { CloudUpload, RefreshCw } from "lucide-react"

function useOnline() {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  )
}

export function Conexao() {
  const online = useOnline()
  const pendentes = useMutationState({
    filters: { predicate: (m) => m.state.isPaused },
  }).length

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (online && pendentes === 0 && !needRefresh) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[2000] flex flex-col items-center gap-2 p-3">
      {!online && (
        <div
          role="status"
          className="pointer-events-auto flex items-center gap-2.5 rounded-xl border-2 border-amber-400/60 bg-amber-500/95 px-4 py-2 text-sm font-bold text-amber-950 shadow-lg"
        >
          <img src="/sem-internet.png" alt="" className="size-11 shrink-0 [image-rendering:pixelated]" />
          <span>Sem internet — mostrando o que já foi salvo.</span>
        </div>
      )}

      {pendentes > 0 && (
        <div
          role="status"
          className="pointer-events-auto flex items-center gap-2 rounded-xl border-2 border-hu-bright/60 bg-hu-panel px-4 py-2 text-sm font-medium text-hu-text shadow-lg"
        >
          <CloudUpload className="size-5 shrink-0 text-hu-bright" aria-hidden />
          <span>
            {pendentes} {pendentes === 1 ? "envio pendente" : "envios pendentes"} — vamos enviar
            quando a internet voltar.
          </span>
        </div>
      )}

      {needRefresh && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border-2 border-hu-bright bg-hu-panel px-4 py-2 text-sm text-hu-text shadow-lg">
          <span>Tem uma versão nova do app.</span>
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-hu-bright px-3 font-bold text-hu-bg"
          >
            <RefreshCw className="size-4" aria-hidden />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            className="text-hu-muted underline"
          >
            Agora não
          </button>
        </div>
      )}
    </div>
  )
}
