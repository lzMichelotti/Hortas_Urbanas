import type { ReactNode } from "react"
import { Guia } from "@/components/guia"

// Mesma madeira da Plaquinha do canteiro; o texto fica em fonte legível (instrução).
export function PlacaDaHorta({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-end justify-center gap-2">
      <Guia className="h-36 w-18 shrink-0 drop-shadow-[0_2px_0_rgba(0,0,0,.3)]" />
      <div className="flex flex-col items-center">
        <div className="hu-pop relative flex max-w-60 flex-col items-center gap-2 rounded-md border-4 border-[#5b3a1a] bg-[#8a5a2b] px-6 py-4 text-center text-[#ffe8c2] shadow-[0_4px_0_rgba(0,0,0,.3)]">
          <span aria-hidden className="absolute top-1.5 left-1.5 size-1.5 rounded-full bg-[#5b3a1a]" />
          <span aria-hidden className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#5b3a1a]" />
          {children}
        </div>
        <div aria-hidden className="h-8 w-3 bg-[#5b3a1a]" />
      </div>
    </div>
  )
}

export function Chao() {
  return <div aria-hidden className="-mt-1 h-3 rounded-full bg-[#5da33f] dark:bg-[#2f5a2a]" />
}
