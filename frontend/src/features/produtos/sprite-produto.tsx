import { cn } from "@/lib/utils"
import { Plantinha, type Estagio } from "@/components/plantinha"
import { spriteProduto } from "@/features/produtos/sprites"

export function SpriteProduto({ nome, className }: { nome?: string | null; className?: string }) {
  const src = spriteProduto(nome)
  if (!src) return null
  return <img src={src} alt="" aria-hidden className={cn("[image-rendering:pixelated] object-contain", className)} />
}

export function ArtePlanta({
  nome,
  estagio,
  className,
}: {
  nome?: string | null
  estagio: Estagio
  className?: string
}) {
  const src = estagio === "pronta" ? spriteProduto(nome) : null
  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        className={cn("[image-rendering:pixelated] object-contain drop-shadow-[0_2px_0_rgba(0,0,0,.35)]", className)}
      />
    )
  }
  return <Plantinha estagio={estagio} className={className} />
}
