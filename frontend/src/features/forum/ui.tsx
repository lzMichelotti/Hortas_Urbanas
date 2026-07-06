import { useEffect, useMemo, useState } from "react"
import { Heart, X } from "lucide-react"
import { srcAvatar } from "@/features/perfil/avatares"
import { useAlternarLike } from "@/features/forum/use-forum"
import { isAuthenticated } from "@/lib/auth/session"

export function GaleriaFotos({
  imagens,
  className = "",
}: {
  imagens: { id: number; image_url: string }[]
  className?: string
}) {
  if (imagens.length === 0) return null
  if (imagens.length === 1) {
    return (
      <img
        src={imagens[0].image_url}
        alt=""
        loading="lazy"
        className={`max-h-80 w-full rounded-lg bg-hu-soft object-cover ${className}`}
      />
    )
  }
  return (
    <div className={`grid grid-cols-2 gap-1.5 ${className}`}>
      {imagens.map((img) => (
        <img
          key={img.id}
          src={img.image_url}
          alt=""
          loading="lazy"
          className="aspect-square w-full rounded-lg bg-hu-soft object-cover"
        />
      ))}
    </div>
  )
}

export function MiniPrevia({ file, onRemover }: { file: File; onRemover: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <div className="relative size-16 shrink-0">
      <img src={url} alt="" className="size-16 rounded-lg border-2 border-hu-soft object-cover" />
      <button
        type="button"
        onClick={onRemover}
        aria-label="Remover foto"
        className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-hu-text text-hu-bg"
      >
        <X className="size-3" aria-hidden />
      </button>
    </div>
  )
}

export function Avatar({ avatar, className = "" }: { avatar?: string | null; className?: string }) {
  return (
    <img
      src={srcAvatar(avatar)}
      alt=""
      className={`size-10 shrink-0 rounded-full bg-hu-soft object-cover ${className}`}
    />
  )
}

export function BotaoCurtir({
  postId,
  likes,
  euCurti,
}: {
  postId: number
  likes: number
  euCurti: boolean
}) {
  const curtir = useAlternarLike()
  const [bater, setBater] = useState(false)

  const conteudo = (
    <>
      <Heart
        onAnimationEnd={() => setBater(false)}
        className={`size-5 transition-colors ${euCurti ? "fill-red-500 text-red-500" : ""} ${bater ? "hu-bater" : ""}`}
        aria-hidden
      />
      {likes > 0 && <span className="text-sm font-bold tabular-nums">{likes}</span>}
    </>
  )

  if (!isAuthenticated()) {
    return <span className="inline-flex h-11 items-center gap-1.5 text-hu-muted">{conteudo}</span>
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!euCurti) setBater(true)
        curtir.mutate(postId)
      }}
      aria-pressed={euCurti}
      aria-label={euCurti ? "Descurtir" : "Curtir"}
      className={`inline-flex h-11 items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright ${
        euCurti ? "text-red-500" : "text-hu-muted"
      }`}
    >
      {conteudo}
    </button>
  )
}
