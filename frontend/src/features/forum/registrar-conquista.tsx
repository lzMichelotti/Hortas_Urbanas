import { useState } from "react"
import { Link } from "react-router"
import { Camera, PartyPopper, Send } from "lucide-react"
import { tirarFoto } from "@/features/forum/fotos"
import { useCriarPostComFotos } from "@/features/forum/use-forum"
import { MiniPrevia } from "@/features/forum/ui"
import { Aviso } from "@/components/feedback"

const MAX = 2000

function legendaPadrao(variante: "plantio" | "colheita", nome: string): string {
  return variante === "colheita" ? `Colhi ${nome}! 🧺` : `Plantei ${nome}! 🌱`
}

export function RegistrarConquista({
  variante,
  nome,
  onConcluir,
}: {
  variante: "plantio" | "colheita"
  nome: string
  onConcluir: () => void
}) {
  const [foto, setFoto] = useState<File | null>(null)
  const [texto, setTexto] = useState(() => legendaPadrao(variante, nome))
  const [erroCamera, setErroCamera] = useState<string | null>(null)
  const [postId, setPostId] = useState<number | null>(null)
  const criar = useCriarPostComFotos()

  async function abrirCamera() {
    setErroCamera(null)
    try {
      setFoto(await tirarFoto())
    } catch (e) {
      setErroCamera(e instanceof Error ? e.message : "Não foi possível abrir a câmera.")
    }
  }

  function postar() {
    const limpo = texto.trim()
    if (!foto || !limpo) return
    criar.mutate({ conteudo: limpo, fotos: [foto] }, { onSuccess: (post) => setPostId(post.id) })
  }

  const cartao = "w-full max-w-sm rounded-2xl border-4 border-hu-bright bg-hu-panel p-4 text-hu-text"
  const pop = { animation: "hu-pop 0.4s ease-out 0.6s both" }

  if (postId != null) {
    return (
      <div className={`${cartao} text-center`} style={pop}>
        <p className="font-bold">Publicado! 🎉</p>
        <Link
          to={`/forum/${postId}`}
          className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
        >
          Ver no fórum
        </Link>
        <button type="button" onClick={onConcluir} className="mt-2 h-11 w-full text-sm text-hu-muted hover:text-hu-text">
          Fechar
        </button>
      </div>
    )
  }

  if (foto) {
    return (
      <div className={cartao} style={pop}>
        <div className="flex items-start gap-3">
          <MiniPrevia file={foto} onRemover={() => setFoto(null)} />
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, MAX))}
            rows={3}
            aria-label="Legenda da conquista"
            className="min-w-0 flex-1 resize-none rounded-lg border-2 border-hu-soft bg-hu-bg p-2 text-base text-hu-text placeholder:text-hu-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hu-bright/50"
          />
        </div>
        {criar.isError && (
          <Aviso variante="erro" className="mt-3">
            {criar.error.message}
          </Aviso>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={onConcluir} className="h-11 px-2 text-sm text-hu-muted hover:text-hu-text">
            Cancelar
          </button>
          <button
            type="button"
            onClick={postar}
            disabled={!texto.trim() || criar.isPending}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-hu-bright px-5 font-bold text-hu-bg hover:bg-hu-bright/90 disabled:opacity-50"
          >
            <Send className="size-5" aria-hidden />
            {criar.isPending ? "Enviando…" : "Postar"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`${cartao} text-center`} style={pop}>
      <p className="flex items-center justify-center gap-2 font-bold">
        <PartyPopper className="size-5 text-hu-bright" aria-hidden />
        Registre essa conquista!
      </p>
      <p className="mt-1 text-sm text-hu-muted">Tire uma foto e compartilhe no fórum da comunidade.</p>
      {erroCamera && <p className="mt-2 text-sm text-red-600">{erroCamera}</p>}
      <button
        type="button"
        onClick={abrirCamera}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
      >
        <Camera className="size-5" aria-hidden />
        Tirar foto
      </button>
      <button type="button" onClick={onConcluir} className="mt-2 h-11 w-full text-sm text-hu-muted hover:text-hu-text">
        Agora não
      </button>
    </div>
  )
}
