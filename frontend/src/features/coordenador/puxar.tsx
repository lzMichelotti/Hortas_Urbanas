import { RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { DISTANCIA_PX } from "./use-puxar"

export function IndicadorPuxar({ puxada, atualizando }: { puxada: number; atualizando: boolean }) {
  const altura = atualizando ? DISTANCIA_PX / 1.5 : puxada
  if (altura === 0) return null
  return (
    <div aria-hidden className="flex items-end justify-center overflow-hidden" style={{ height: altura }}>
      <RotateCw
        className={cn("mb-2 size-7 text-hu-bright", atualizando && "animate-spin")}
        style={atualizando ? undefined : { transform: `rotate(${puxada * 4}deg)`, opacity: Math.min(1, puxada / DISTANCIA_PX) }}
      />
    </div>
  )
}
