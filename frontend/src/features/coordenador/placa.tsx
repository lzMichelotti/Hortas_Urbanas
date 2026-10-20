import type { ReactNode } from "react"
import { Wifi } from "lucide-react"
import { Guia } from "@/components/guia"
import { Button } from "@/components/ui/button"

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

function Chao() {
  return <div aria-hidden className="-mt-1 h-3 rounded-full bg-[#5da33f] dark:bg-[#2f5a2a]" />
}

export function PlacaProcurando() {
  return (
    <div role="status" aria-live="polite" className="mt-6">
      <PlacaDaHorta>
        <Wifi className="size-14 animate-pulse" aria-hidden />
        <p className="text-lg font-bold leading-snug">Procurando os sensores…</p>
      </PlacaDaHorta>
      <Chao />
    </div>
  )
}

export function PlacaConectar({ aoConectar, aoJaConectei }: { aoConectar: () => void; aoJaConectei: () => void }) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <div>
        <PlacaDaHorta>
          <Wifi className="size-14" aria-hidden />
          <p className="text-lg font-bold leading-snug">Conecte no Wi-Fi da horta</p>
        </PlacaDaHorta>
        <Chao />
      </div>
      <Button
        onClick={aoConectar}
        className="h-14 gap-3 rounded-xl bg-hu-bright text-lg font-bold text-hu-bg hover:bg-hu-bright/90"
      >
        <Wifi className="size-6" aria-hidden />
        Conectar
      </Button>
      <button
        type="button"
        onClick={aoJaConectei}
        className="-mt-2 self-center rounded-lg p-2 text-base font-medium text-hu-bright hover:bg-black/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hu-bright/50"
      >
        Já conectei
      </button>
    </div>
  )
}
