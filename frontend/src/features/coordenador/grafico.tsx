import type { Ponto } from "./historico"

const LARGURA = 300
const ALTURA = 100

// Linha simples em SVG, sem biblioteca. Um buraco maior que 2 intervalos quebra a
// linha, para não ligar dois pontos com dias sem leitura no meio.
export function Grafico({
  pontos,
  desde,
  ate,
  intervaloMs,
  formatar,
}: {
  pontos: Ponto[]
  desde: number
  ate: number
  intervaloMs: number
  formatar: (v: number) => string
}) {
  if (pontos.length === 0) {
    return <p className="py-6 text-center text-base text-hu-muted">Sem leituras neste período.</p>
  }
  const valores = pontos.map((p) => p.v)
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const folga = max - min || 1
  const x = (t: number) => ((t - desde) / (ate - desde)) * LARGURA
  const y = (v: number) => ALTURA - 8 - ((v - min) / folga) * (ALTURA - 16)

  const trechos: Ponto[][] = []
  for (const p of pontos) {
    const atual = trechos[trechos.length - 1]
    if (atual && p.t - atual[atual.length - 1].t <= intervaloMs * 2) atual.push(p)
    else trechos.push([p])
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm text-hu-muted">
        <span>máx. {formatar(max)}</span>
        <span>mín. {formatar(min)}</span>
      </div>
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        preserveAspectRatio="none"
        className="h-28 w-full rounded-lg bg-black/5"
        aria-hidden
      >
        {trechos.map((t, i) =>
          t.length === 1 ? (
            <circle key={i} cx={x(t[0].t)} cy={y(t[0].v)} r={2.5} className="fill-hu-bright" />
          ) : (
            <polyline
              key={i}
              points={t.map((p) => `${x(p.t)},${y(p.v)}`).join(" ")}
              fill="none"
              strokeWidth={2.5}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              className="stroke-hu-bright"
            />
          ),
        )}
      </svg>
    </div>
  )
}
