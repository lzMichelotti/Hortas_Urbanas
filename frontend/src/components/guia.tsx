import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type Humor = "neutra" | "feliz"

export function Guia({ className }: { humor?: Humor; className?: string }) {
  return <img src="/persona-pixel.png" alt="" className={cn("[image-rendering:pixelated] object-contain", className)} />
}

export function FalaDaGuia({ humor = "neutra", children }: { humor?: Humor; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Guia humor={humor} className="size-16 shrink-0 drop-shadow-[0_2px_0_rgba(0,0,0,.3)]" />
      <div className="hu-pop relative flex-1 rounded-2xl border-2 border-hu-bright bg-hu-panel px-4 py-3 text-base font-bold text-hu-text">
        <span
          aria-hidden
          className="absolute top-5 -left-1.5 size-3 rotate-45 border-b-2 border-l-2 border-hu-bright bg-hu-panel"
        />
        {children}
      </div>
    </div>
  )
}
