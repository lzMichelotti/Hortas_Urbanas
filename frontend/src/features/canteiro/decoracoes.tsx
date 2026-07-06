import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const ESCURA = "#5b3a1a"
const MADEIRA = "#7a4a2a"
const RIPA = "#b07a44"
const FOLHA = "#4ccc6f"
const FOLHA_ESC = "#2e8b57"
const UVA = "#6b3fa0"

export function Parreira({ className }: { className?: string }) {
  const ripas = [16, 32, 48, 64, 80, 96, 112, 128, 144]
  const vinhas = [26, 60, 96, 134]
  return (
    <svg
      viewBox="0 0 160 36"
      shapeRendering="crispEdges"
      preserveAspectRatio="none"
      className={cn("pointer-events-none block h-9 w-full", className)}
      aria-hidden
    >
      <rect x="4" y="9" width="6" height="27" fill={ESCURA} />
      <rect x="150" y="9" width="6" height="27" fill={ESCURA} />
      <rect x="0" y="8" width="160" height="6" fill={MADEIRA} />
      <rect x="0" y="13" width="160" height="2" fill={ESCURA} />
      {ripas.map((x) => (
        <rect key={x} x={x} y="2" width="3" height="7" fill={RIPA} />
      ))}
      {vinhas.map((x, i) => (
        <g key={x}>
          <rect x={x} y="15" width="2" height={8 + (i % 2) * 4} fill={FOLHA_ESC} />
          <rect x={x - 4} y="16" width="4" height="3" fill={FOLHA} />
          <rect x={x + 2} y="19" width="4" height="3" fill={FOLHA} />
          <rect x={x - 3} y="22" width="4" height="3" fill={FOLHA} />
        </g>
      ))}
      {[50, 104].map((x) => (
        <g key={x}>
          <rect x={x} y="17" width="3" height="3" fill={UVA} />
          <rect x={x + 3} y="17" width="3" height="3" fill={UVA} />
          <rect x={x + 1} y="20" width="3" height="3" fill={UVA} />
          <rect x={x + 4} y="20" width="2" height="2" fill={UVA} />
        </g>
      ))}
    </svg>
  )
}

export function Cerca({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none flex h-8 w-full items-stretch", className)} aria-hidden>
      <img src="/cerca-esquerda.png" alt="" className="h-full w-auto [image-rendering:pixelated]" />
      <div
        className="h-full flex-1 [image-rendering:pixelated]"
        style={{ backgroundImage: "url(/cerca-meio.png)", backgroundRepeat: "repeat-x", backgroundSize: "auto 100%" }}
      />
      <img src="/cerca-direita.png" alt="" className="h-full w-auto [image-rendering:pixelated]" />
    </div>
  )
}

export function Plaquinha({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("pointer-events-none flex flex-col items-center", className)} aria-hidden>
      <div className="rounded-[3px] border-[3px] border-[#5b3a1a] bg-[#8a5a2b] px-2 py-1 shadow-[0_2px_0_rgba(0,0,0,.3)]">
        <span className="font-pixel text-[8px] leading-none text-[#ffe8c2]">{children}</span>
      </div>
      <div className="h-3 w-1.5 bg-[#5b3a1a]" />
    </div>
  )
}

export function MolduraCanteiro({ children, etiqueta }: { children: ReactNode; etiqueta?: string }) {
  return (
    <div className="relative">
      <div className="relative z-10 mx-auto w-[92%]">
        <Parreira className="drop-shadow-[0_3px_0_rgba(0,0,0,.18)]" />
        {etiqueta && (
          <Plaquinha className="absolute -bottom-2 right-1 z-20 rotate-[7deg]">{etiqueta}</Plaquinha>
        )}
      </div>
      <div className="relative z-0 -mt-1">{children}</div>
      <Cerca className="mx-auto -mt-1 w-[98%] drop-shadow-[0_3px_0_rgba(0,0,0,.2)]" />
    </div>
  )
}
