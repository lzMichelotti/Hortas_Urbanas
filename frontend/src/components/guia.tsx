import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type Humor = "neutra" | "feliz"

export function Guia({ className }: { humor?: Humor; className?: string }) {
  return <img src="/persona-pixel.png" alt="" className={cn("[image-rendering:pixelated] object-contain", className)} />
}

// Só a cabeça do sprite de corpo inteiro (persona-pixel.png, 64×128), como um retrato
// "falando". backgroundSize/Position enquadram o rosto — os dois números são o ajuste fino.
export function RostoGuia({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block shrink-0 rounded-full border-2 border-hu-bright bg-[#bfe3f6] bg-no-repeat [image-rendering:pixelated] dark:bg-[#243049]",
        className,
      )}
      style={{
        // Enquadra chapéu+rosto+ombro (sprite: cabeça y0–30, ombros ~y31 de 128).
        backgroundImage: "url(/persona-pixel.png)",
        backgroundSize: "170%",
        backgroundPosition: "50% 2%",
      }}
    />
  )
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
