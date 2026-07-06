import { cn } from "@/lib/utils"

export type Estagio = "semente" | "broto" | "crescendo" | "quase" | "pronta"

export function Plantinha({ estagio, className }: { estagio: Estagio; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={cn("size-12 [image-rendering:pixelated] drop-shadow-[0_2px_0_rgba(0,0,0,.35)]", className)}
      aria-hidden
    >
      {estagio === "semente" && (
        <>
          <rect x="5" y="13" width="6" height="1" fill="#7a4a2a" />
          <rect x="7" y="10" width="2" height="3" fill="#2e8b57" />
          <rect x="6" y="10" width="1" height="1" fill="#4ccc6f" />
          <rect x="9" y="10" width="1" height="1" fill="#4ccc6f" />
        </>
      )}
      {estagio === "broto" && (
        <>
          <rect x="7" y="9" width="2" height="5" fill="#2e8b57" />
          <rect x="4" y="8" width="3" height="2" fill="#4ccc6f" />
          <rect x="9" y="8" width="3" height="2" fill="#4ccc6f" />
          <rect x="6" y="6" width="4" height="2" fill="#4ccc6f" />
        </>
      )}
      {estagio === "crescendo" && (
        <>
          <rect x="7" y="5" width="2" height="9" fill="#2e8b57" />
          <rect x="3" y="7" width="4" height="2" fill="#4ccc6f" />
          <rect x="9" y="7" width="4" height="2" fill="#4ccc6f" />
          <rect x="4" y="10" width="3" height="2" fill="#2e8b57" />
          <rect x="9" y="10" width="3" height="2" fill="#2e8b57" />
          <rect x="5" y="3" width="6" height="3" fill="#4ccc6f" />
        </>
      )}
      {estagio === "quase" && (
        <>
          <rect x="7" y="4" width="2" height="10" fill="#2e8b57" />
          <rect x="3" y="6" width="4" height="2" fill="#4ccc6f" />
          <rect x="9" y="6" width="4" height="2" fill="#4ccc6f" />
          <rect x="4" y="9" width="3" height="2" fill="#2e8b57" />
          <rect x="9" y="9" width="3" height="2" fill="#2e8b57" />
          <rect x="5" y="2" width="6" height="3" fill="#4ccc6f" />
          <rect x="7" y="1" width="2" height="2" fill="#ffe08a" />
        </>
      )}
      {estagio === "pronta" && (
        <>
          <rect x="7" y="6" width="2" height="8" fill="#2e8b57" />
          <rect x="3" y="7" width="4" height="2" fill="#4ccc6f" />
          <rect x="9" y="7" width="4" height="2" fill="#4ccc6f" />
          <rect x="4" y="3" width="8" height="4" fill="#4ccc6f" />
          <rect x="5" y="9" width="2" height="2" fill="#e63946" />
          <rect x="9" y="9" width="2" height="2" fill="#e63946" />
        </>
      )}
    </svg>
  )
}
