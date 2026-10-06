import { useState } from "react"
import { Link } from "react-router"
import { Camera, ImagePlus, MessageSquare, Send } from "lucide-react"
import { useFeed, useCriarPostComFotos } from "@/features/forum/use-forum"
import { escolherDaGaleria, tirarFoto, MAX_FOTOS } from "@/features/forum/fotos"
import { Avatar, BotaoCurtir, GaleriaFotos, MiniPrevia } from "@/features/forum/ui"
import { isAuthenticated } from "@/lib/auth/session"
import { tempoRelativo, dataCompleta } from "@/lib/tempo"
import { Carregando, EstadoVazio, FalhaAoCarregar } from "@/components/feedback"
import { Button } from "@/components/ui/button"

const MAX = 2000

function Cabecalho() {
  const logado = isAuthenticated()
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b-4 border-hu-bright bg-hu-panel px-4 py-3 text-hu-text">
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="" className="size-8" />
        <span className="font-pixel text-xs text-hu-text sm:text-sm">Comunidade</span>
      </div>
      <Button asChild className="h-10 rounded-lg bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90">
        <Link to={logado ? "/painel" : "/"}>{logado ? "Painel" : "Entrar"}</Link>
      </Button>
    </header>
  )
}

function BarraPostar() {
  const [texto, setTexto] = useState("")
  const [fotos, setFotos] = useState<File[]>([])
  const [erroFoto, setErroFoto] = useState("")
  const criar = useCriarPostComFotos()
  const limpo = texto.trim()
  const podeEnviar = (limpo.length > 0 || fotos.length > 0) && !criar.isPending
  const cheio = fotos.length >= MAX_FOTOS

  async function adicionar(fn: () => Promise<File[]>) {
    setErroFoto("")
    try {
      const novas = await fn()
      setFotos((f) => [...f, ...novas].slice(0, MAX_FOTOS))
    } catch (e) {
      if (e instanceof Error && !/cancel/i.test(e.message)) setErroFoto(e.message)
    }
  }

  function publicar() {
    if (!podeEnviar) return
    criar.mutate(
      { conteudo: limpo, fotos },
      {
        onSuccess: () => {
          setTexto("")
          setFotos([])
        },
      },
    )
  }

  return (
    <div className="shrink-0 border-t-2 border-hu-soft bg-hu-panel px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      {fotos.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {fotos.map((file, i) => (
            <MiniPrevia
              key={`${file.name}-${i}`}
              file={file}
              onRemover={() => setFotos((f) => f.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}

      <textarea
        rows={2}
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, MAX))}
        placeholder="Escreva algo para a comunidade…"
        aria-label="Escrever na comunidade"
        className="block max-h-40 min-h-12 w-full resize-none rounded-2xl border-2 border-hu-soft bg-hu-bg px-4 py-3 text-base text-hu-text [field-sizing:content] placeholder:text-hu-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hu-bright/50"
      />

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => adicionar(async () => [await tirarFoto()])}
          disabled={cheio || criar.isPending}
          aria-label="Tirar foto"
          className="inline-flex h-11 items-center gap-2 rounded-2xl border-2 border-hu-soft px-3 text-sm font-bold text-hu-text transition-colors hover:bg-hu-bright/10 disabled:opacity-40"
        >
          <Camera className="size-5 text-hu-bright" aria-hidden />
          Câmera
        </button>
        <button
          type="button"
          onClick={() => adicionar(() => escolherDaGaleria(MAX_FOTOS - fotos.length))}
          disabled={cheio || criar.isPending}
          aria-label="Escolher fotos da galeria"
          className="grid size-11 shrink-0 place-items-center rounded-2xl border-2 border-hu-soft text-hu-bright transition-colors hover:bg-hu-bright/10 disabled:opacity-40"
        >
          <ImagePlus className="size-5" aria-hidden />
        </button>
        {fotos.length > 0 && (
          <span className="text-sm font-bold text-hu-muted">{fotos.length}/{MAX_FOTOS}</span>
        )}

        <Button
          onClick={publicar}
          disabled={!podeEnviar}
          className="ml-auto h-11 gap-2 rounded-2xl bg-hu-bright px-5 text-base font-bold text-hu-bg hover:bg-hu-bright/90"
        >
          <Send className="size-5" aria-hidden />
          Publicar
        </Button>
      </div>

      {criar.isPending && criar.progresso.total > 0 && (
        <p className="mt-2 text-sm text-hu-muted">
          Enviando fotos {criar.progresso.enviadas}/{criar.progresso.total}…
        </p>
      )}
      {(erroFoto || criar.isError) && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {erroFoto || criar.error?.message}
        </p>
      )}
    </div>
  )
}

export function ForumPage() {
  const feed = useFeed()
  const posts = feed.data?.pages.flatMap((p) => p.items) ?? []
  const vazio = !feed.isPending && !feed.isLoadingError && posts.length === 0

  return (
    <div className="flex h-svh flex-col bg-hu-bg">
      <Cabecalho />

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {feed.isPending && <Carregando className="mt-6" />}

        {feed.isLoadingError && <FalhaAoCarregar className="mt-6" />}

        {vazio && (
          <EstadoVazio ilustracao="/personagem-crianca.webp">
            Ainda não há nada por aqui. Seja o primeiro a postar! 🌱
          </EstadoVazio>
        )}

        {posts.length > 0 && (
          <ul className="flex flex-col gap-3">
            {posts.map((post) => (
              <li
                key={post.id}
                className="rounded-2xl border-2 border-hu-soft bg-hu-panel text-hu-text transition-colors focus-within:border-hu-bright hover:border-hu-bright"
              >
                <Link
                  to={`/forum/${post.id}`}
                  aria-label={`Abrir post de ${post.autor?.nome ?? "usuário removido"}`}
                  className="block rounded-t-2xl p-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hu-bright/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar avatar={post.autor?.avatar} />
                    <div className="min-w-0">
                      <p className="truncate font-bold">{post.autor?.nome ?? "Usuário removido"}</p>
                      <p className="truncate text-sm text-hu-muted">
                        {post.autor?.horta ? `${post.autor.horta} · ` : ""}
                        <time dateTime={post.criado_em} title={dataCompleta(post.criado_em)}>
                          {tempoRelativo(post.criado_em)}
                        </time>
                      </p>
                    </div>
                  </div>

                  {post.conteudo && (
                    <p className="mt-3 line-clamp-4 whitespace-pre-wrap break-words text-base">{post.conteudo}</p>
                  )}

                  <GaleriaFotos imagens={post.imagens} className="mt-3" />
                </Link>

                <div className="flex items-center justify-between border-t border-hu-soft px-3 py-1 text-sm">
                  <BotaoCurtir postId={post.id} likes={post.likes_count} euCurti={post.eu_curti} />
                  <Link
                    to={`/forum/${post.id}`}
                    className="inline-flex h-11 items-center gap-1.5 px-2 text-hu-muted transition-colors hover:text-hu-bright"
                  >
                    <MessageSquare className="size-4" aria-hidden />
                    {post.respostas_count} {post.respostas_count === 1 ? "resposta" : "respostas"}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        {feed.hasNextPage && (
          <Button
            onClick={() => feed.fetchNextPage()}
            disabled={feed.isFetchingNextPage}
            variant="outline"
            className="mt-3 h-12 w-full rounded-xl border-hu-soft bg-transparent text-base font-bold text-hu-text hover:bg-black/5"
          >
            {feed.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
          </Button>
        )}
      </main>

      {isAuthenticated() ? (
        <BarraPostar />
      ) : (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t-2 border-hu-soft bg-hu-panel px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <span className="text-base text-hu-muted">Entre para postar e responder.</span>
          <Button asChild className="h-11 rounded-lg bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90">
            <Link to="/">Entrar</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
