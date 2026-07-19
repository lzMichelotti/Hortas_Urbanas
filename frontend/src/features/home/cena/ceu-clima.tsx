import { useClima } from "@/features/mapa/use-clima"
import { descreverClima } from "@/features/mapa/clima-icones"
import { ConteudoClima } from "@/features/mapa/clima-widget"
import { FolhaInferior } from "@/components/ui/folha-inferior"

export function CeuClima() {
  const { data, isError } = useClima()
  const atual = data ? descreverClima(data.atual.codigo) : null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-end gap-2 px-3 py-2">
      {data && atual ? (
        <FolhaInferior
          titulo="Clima"
          gatilho={
            <button
              type="button"
              aria-label="Ver previsão do tempo"
              className="pointer-events-auto relative flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[#1b2e1f] transition-colors before:absolute before:-inset-2.5 before:content-[''] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
            >
              <span className="text-lg leading-none">{atual.emoji}</span>
              <span className="font-pixel text-xs">{Math.round(data.atual.temperatura)}°</span>
            </button>
          }
        >
          <ConteudoClima />
        </FolhaInferior>
      ) : (
        !isError && <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] text-[#1b2e1f] dark:bg-white/15 dark:text-white/80">clima…</span>
      )}
    </div>
  )
}
