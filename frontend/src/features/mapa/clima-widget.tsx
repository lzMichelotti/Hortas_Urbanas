import { useClima } from "@/features/mapa/use-clima"
import { descreverClima } from "@/features/mapa/clima-icones"

function rotuloDia(data: string, i: number): string {
  if (i === 0) return "hoje"
  return new Date(`${data}T00:00`)
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "")
}

// Painel flutuante do clima — só no desktop. No mobile o mesmo conteúdo
// (ConteudoClima) é mostrado numa folha inferior, ver mapa.tsx.
export function ClimaWidget() {
  return (
    <div className="absolute right-4 top-20 z-[1000] hidden w-72 rounded-2xl border-4 border-hu-bright bg-hu-panel/95 p-3 text-hu-text md:block">
      <p className="font-pixel text-xs text-hu-text">Clima</p>
      <ConteudoClima />
    </div>
  )
}

export function ConteudoClima() {
  const { data, isPending, isError } = useClima()
  const atual = data ? descreverClima(data.atual.codigo) : null

  return (
    <>
      {isPending && <p className="mt-2 text-xs text-hu-muted">Carregando…</p>}
      {isError && <p className="mt-2 text-xs text-hu-muted">Clima indisponível</p>}

      {data && atual && (
        <>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-3xl leading-none">{atual.emoji}</span>
            <div>
              <p className="font-pixel text-base text-hu-text">{Math.round(data.atual.temperatura)}°</p>
              <p className="text-xs text-hu-muted">{atual.texto}</p>
            </div>
          </div>
          <p className="mt-1 text-xs text-hu-text/80">
            sensação {Math.round(data.atual.sensacao)}° · vento {Math.round(data.atual.vento)} km/h
          </p>

          <div className="mt-3 flex gap-1 border-t border-hu-soft pt-2">
            {data.dias.map((d, i) => (
              <div key={d.data} className="flex min-w-0 flex-1 flex-col items-center gap-0.5 text-center">
                <span className="text-[10px] text-hu-muted">{rotuloDia(d.data, i)}</span>
                <span className="text-lg leading-none">{descreverClima(d.codigo).emoji}</span>
                <span className="text-xs font-bold text-hu-text">{Math.round(d.temp_max)}°</span>
                <span className="text-[10px] text-hu-muted">{Math.round(d.temp_min)}°</span>
                {d.chance_chuva != null && d.chance_chuva > 0 && (
                  <span className="text-[10px] text-[#7fb8e6]">💧{d.chance_chuva}%</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
