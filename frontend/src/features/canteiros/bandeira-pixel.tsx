import { cn } from "@/lib/utils"
import type { Bandeira } from "./bandeira"

const COR: Record<Bandeira, string> = {
  vermelha: "#ef4444",
  amarela: "#f59e0b",
  verde: "#22c55e",
}

const MASTRO = "#5b3a1a"

// Balanço sutil em passos (pixel), desligado sob prefers-reduced-motion.
// React 19 iça e deduplica esta <style> pela chave href.
const CSS = `
@keyframes hu-bandeira-balanca { from { transform: rotate(-3deg) } to { transform: rotate(3deg) } }
.hu-bandeira-flag { transform-origin: 0 100%; animation: hu-bandeira-balanca 1.2s steps(2) infinite alternate; }
@media (prefers-reduced-motion: reduce) { .hu-bandeira-flag { animation: none; } }
`

export function BandeiraPixel({
  bandeira,
  size = 14,
  className,
}: {
  bandeira: Bandeira
  size?: number
  className?: string
}) {
  return (
    <>
      <style href="hu-bandeira-pixel" precedence="default">
        {CSS}
      </style>
      <svg
        viewBox="0 0 7 9"
        width={size}
        height={Math.round((size * 9) / 7)}
        shapeRendering="crispEdges"
        className={cn("hu-bandeira-flag inline-block shrink-0 align-[-0.2em] [image-rendering:pixelated]", className)}
        aria-hidden
      >
        <rect x="0" y="0" width="1" height="9" fill={MASTRO} />
        <g fill={COR[bandeira]}>
          <rect x="1" y="1" width="5" height="1" />
          <rect x="1" y="2" width="5" height="1" />
          <rect x="1" y="3" width="4" height="1" />
          <rect x="1" y="4" width="3" height="1" />
          <rect x="1" y="5" width="2" height="1" />
        </g>
      </svg>
    </>
  )
}
