import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { Flag, Send, Trash2 } from "lucide-react"
import {
  usePost,
  useResponder,
  useApagarPost,
  useApagarResposta,
  useDenunciarPost,
  useDenunciarResposta,
} from "@/features/forum/use-forum"
import { useMe } from "@/features/auth/use-me"
import { Avatar, BotaoCurtir, GaleriaFotos } from "@/features/forum/ui"
import { isAuthenticated } from "@/lib/auth/session"
import { ApiError } from "@/lib/api/errors"
import { tempoRelativo, dataCompleta } from "@/lib/tempo"
import { Aviso, Carregando } from "@/components/feedback"
import { ConfirmacaoInline } from "@/components/confirmar"
import { Button } from "@/components/ui/button"
import { Voltar } from "@/components/voltar"

const MAX = 2000

function Autoria({ nome, avatar, horta, criadoEm }: { nome?: string | null; avatar?: string | null; horta?: string | null; criadoEm: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar avatar={avatar} />
      <div className="min-w-0">
        <p className="truncate font-bold text-hu-text">{nome ?? "Usuário removido"}</p>
        <p className="truncate text-sm text-hu-muted">
          {horta ? `${horta} · ` : ""}
          <time dateTime={criadoEm} title={dataCompleta(criadoEm)}>
            {tempoRelativo(criadoEm)}
          </time>
        </p>
      </div>
    </div>
  )
}

function AcoesItem({
  alvo,
  podeApagar,
  apagar,
  apagando,
  podeDenunciar,
  denunciar,
  denunciando,
  denunciado,
}: {
  alvo: string
  podeApagar: boolean
  apagar: () => void
  apagando: boolean
  podeDenunciar: boolean
  denunciar: (motivo?: string) => void
  denunciando: boolean
  denunciado: boolean
}) {
  const [aberto, setAberto] = useState<"apagar" | "denunciar" | null>(null)
  const [motivo, setMotivo] = useState("")

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {podeApagar && (
          <button
            type="button"
            onClick={() => setAberto(aberto === "apagar" ? null : "apagar")}
            aria-expanded={aberto === "apagar"}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-red-400/40 px-3 text-sm text-red-600 hover:bg-red-500/15"
          >
            <Trash2 className="size-4" aria-hidden />
            Apagar
          </button>
        )}
        {podeDenunciar && !denunciado && (
          <button
            type="button"
            onClick={() => setAberto(aberto === "denunciar" ? null : "denunciar")}
            aria-expanded={aberto === "denunciar"}
            className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-hu-soft px-3 text-sm text-hu-muted hover:bg-black/5"
          >
            <Flag className="size-4" aria-hidden />
            Denunciar
          </button>
        )}
        {denunciado && (
          <span className="inline-flex h-11 items-center gap-2 px-1 text-sm text-hu-muted">
            <Flag className="size-4" aria-hidden />
            Denúncia enviada ✓
          </span>
        )}
      </div>

      {aberto === "apagar" && (
        <ConfirmacaoInline
          pergunta={<>Apagar {alvo}? Esta ação não pode ser desfeita.</>}
          rotuloConfirmar="Sim, apagar"
          rotuloConfirmando="Apagando…"
          confirmando={apagando}
          aoConfirmar={apagar}
          aoCancelar={() => setAberto(null)}
        />
      )}

      {aberto === "denunciar" && (
        <div role="group" className="mt-3 flex flex-col gap-2 border-t border-hu-soft pt-3">
          <label htmlFor="motivo" className="text-sm text-hu-muted">
            Conte o motivo (opcional):
          </label>
          <input
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value.slice(0, 280))}
            placeholder="Ex: conteúdo ofensivo"
            className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg px-3 text-base text-hu-text placeholder:text-hu-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hu-bright/50"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => denunciar(motivo.trim() || undefined)}
              disabled={denunciando}
              className="h-11 rounded-lg bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
            >
              {denunciando ? "Enviando…" : "Enviar denúncia"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAberto(null)}
              className="h-11 rounded-lg border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function CaixaResponder({ postId }: { postId: number }) {
  const [texto, setTexto] = useState("")
  const responder = useResponder(postId)
  const limpo = texto.trim()

  return (
    <div className="mt-5 rounded-2xl border-4 border-hu-bright bg-hu-panel p-4">
      <label htmlFor="nova-resposta" className="text-base font-bold text-hu-text">
        Responder
      </label>
      <textarea
        id="nova-resposta"
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, MAX))}
        rows={3}
        placeholder="Escreva sua resposta…"
        className="mt-2 w-full resize-y rounded-lg border-2 border-hu-soft bg-hu-bg p-3 text-base text-hu-text placeholder:text-hu-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hu-bright/50"
      />
      {responder.isError && (
        <Aviso variante="erro" className="mt-3">
          {responder.error.message}
        </Aviso>
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-hu-muted">{texto.length}/{MAX}</span>
        <Button
          onClick={() => limpo && responder.mutate({ conteudo: limpo }, { onSuccess: () => setTexto("") })}
          disabled={!limpo || responder.isPending}
          className="h-12 gap-2 rounded-xl bg-hu-bright px-5 text-base font-bold text-hu-bg hover:bg-hu-bright/90"
        >
          <Send className="size-5" aria-hidden />
          {responder.isPending ? "Enviando…" : "Responder"}
        </Button>
      </div>
    </div>
  )
}

export function ForumPostPage() {
  const { id } = useParams()
  const postId = Number(id)
  const navigate = useNavigate()
  const me = useMe()
  const post = usePost(postId)

  const apagarPost = useApagarPost()
  const apagarResposta = useApagarResposta(postId)
  const denunciarPost = useDenunciarPost()
  const denunciarResposta = useDenunciarResposta()

  const ehModerador =
    me.data?.privilegio === "ADMIN_SUPREMO" || me.data?.privilegio === "LIDER_HORTA"
  const meuId = me.data?.id
  const logado = isAuthenticated()
  const podeApagar = (autorId?: number | null) =>
    ehModerador || (meuId != null && autorId === meuId)
  const podeDenunciar = (autorId?: number | null) => logado && autorId !== meuId
  const naoExiste = post.error instanceof ApiError && post.error.status === 404

  return (
    <div className="min-h-svh bg-hu-bg">
      <div className="mx-auto max-w-2xl px-4 py-4 pb-16">
        <Voltar to="/forum" />

        {post.isPending && <Carregando className="mt-6" />}

        {post.isError && (
          <Aviso
            variante="erro"
            className="mt-6"
            aoTentarNovamente={naoExiste ? undefined : () => post.refetch()}
          >
            {naoExiste ? (
              <>
                Este post não existe mais.{" "}
                <Link to="/forum" className="font-bold underline">
                  Voltar à comunidade
                </Link>
                .
              </>
            ) : (
              "Não foi possível carregar. Veja sua internet e tente de novo."
            )}
          </Aviso>
        )}

        {post.data && (
          <article className="mt-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5 text-hu-text">
            <Autoria nome={post.data.autor?.nome} avatar={post.data.autor?.avatar} horta={post.data.autor?.horta} criadoEm={post.data.criado_em} />
            {post.data.conteudo && (
              <p className="mt-3 whitespace-pre-wrap break-words text-base">{post.data.conteudo}</p>
            )}
            <GaleriaFotos imagens={post.data.imagens} className="mt-3" />
            <div className="mt-4 border-t border-hu-soft pt-2">
              <BotaoCurtir postId={postId} likes={post.data.likes_count} euCurti={post.data.eu_curti} />
            </div>
            {(podeApagar(post.data.autor?.id) || podeDenunciar(post.data.autor?.id)) && (
              <AcoesItem
                alvo="este post"
                podeApagar={podeApagar(post.data.autor?.id)}
                apagar={() =>
                  apagarPost.mutate(postId, { onSuccess: () => navigate("/forum", { replace: true }) })
                }
                apagando={apagarPost.isPending}
                podeDenunciar={podeDenunciar(post.data.autor?.id)}
                denunciar={(motivo) => denunciarPost.mutate({ id: postId, motivo })}
                denunciando={denunciarPost.isPending}
                denunciado={denunciarPost.isSuccess}
              />
            )}
            {apagarPost.isError && (
              <Aviso variante="erro" className="mt-3">
                {apagarPost.error.message}
              </Aviso>
            )}
          </article>
        )}

        {post.data && (
          <section className="mt-6">
            <h2 className="font-pixel text-xs text-hu-muted">
              {post.data.respostas.length}{" "}
              {post.data.respostas.length === 1 ? "resposta" : "respostas"}
            </h2>

            {post.data.respostas.length > 0 && (
              <ul className="mt-3 flex flex-col gap-3">
                {post.data.respostas.map((r) => {
                  const apagandoEsta = apagarResposta.isPending && apagarResposta.variables === r.id
                  const denunciandoEsta =
                    denunciarResposta.isPending && denunciarResposta.variables?.id === r.id
                  const denunciadaEsta =
                    denunciarResposta.isSuccess && denunciarResposta.variables?.id === r.id
                  return (
                    <li key={r.id} className="rounded-2xl border-4 border-hu-soft bg-hu-panel p-4 text-hu-text">
                      <Autoria nome={r.autor?.nome} avatar={r.autor?.avatar} horta={r.autor?.horta} criadoEm={r.criado_em} />
                      <p className="mt-2 whitespace-pre-wrap break-words text-base">{r.conteudo}</p>
                      {(podeApagar(r.autor?.id) || podeDenunciar(r.autor?.id)) && (
                        <AcoesItem
                          alvo="esta resposta"
                          podeApagar={podeApagar(r.autor?.id)}
                          apagar={() => apagarResposta.mutate(r.id)}
                          apagando={apagandoEsta}
                          podeDenunciar={podeDenunciar(r.autor?.id)}
                          denunciar={(motivo) => denunciarResposta.mutate({ id: r.id, motivo })}
                          denunciando={denunciandoEsta}
                          denunciado={denunciadaEsta}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {apagarResposta.isError && (
              <Aviso variante="erro" className="mt-3">
                {apagarResposta.error.message}
              </Aviso>
            )}

            {logado ? (
              <CaixaResponder postId={postId} />
            ) : (
              <p className="mt-5 rounded-2xl border-2 border-hu-soft bg-black/5 px-4 py-3 text-base text-hu-muted">
                Para responder,{" "}
                <Link to="/" className="font-bold text-hu-bright underline">
                  entre na sua conta
                </Link>
                .
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
