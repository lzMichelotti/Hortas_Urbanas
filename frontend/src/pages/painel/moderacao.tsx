import { useState } from "react"
import { Link } from "react-router"
import { ArrowRight, Flag } from "lucide-react"
import { useArquivarDenuncia, useDenuncias } from "@/features/admin/use-painel-admin"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import { ConfirmacaoInline } from "@/components/confirmar"
import { Aviso, Carregando, EstadoVazio } from "@/components/feedback"
import { tempoRelativo } from "@/lib/tempo"

export function ModeracaoPage() {
  const denuncias = useDenuncias()
  const arquivar = useArquivarDenuncia()
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)

  if (denuncias.isPending) return <Carregando />

  if (denuncias.isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <Aviso variante="erro" className="mt-6" aoTentarNovamente={() => denuncias.refetch()}>
          Não foi possível carregar as denúncias. Veja sua internet e tente de novo.
        </Aviso>
      </div>
    )
  }

  const lista = denuncias.data ?? []

  return (
    <div className="mx-auto max-w-2xl pb-4">
      <Voltar />
      <h1 className="mt-4 font-pixel text-sm leading-relaxed text-hu-bright">
        Denúncias do fórum {lista.length > 0 && <span className="text-hu-muted">({lista.length})</span>}
      </h1>

      {lista.length === 0 ? (
        <EstadoVazio ilustracao="/personagem-idoso.webp">
          Nenhuma denúncia esperando. O fórum está tranquilo!
        </EstadoVazio>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {lista.map((d) => (
            <li
              key={d.id}
              className="rounded-2xl border-2 border-hu-soft bg-hu-panel p-4 text-hu-text"
            >
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-hu-muted">
                <Flag className="size-4 shrink-0 text-amber-500" aria-hidden />
                <span>
                  {d.resposta_id ? "Resposta" : "Post"} de{" "}
                  <span className="font-bold text-hu-text">{d.autor?.nome ?? "alguém que saiu"}</span>
                  {d.autor?.horta && ` · ${d.autor.horta}`}
                </span>
                <span aria-hidden>·</span>
                <span>{tempoRelativo(d.criado_em)}</span>
              </p>

              <blockquote className="mt-2 border-l-4 border-hu-soft pl-3 text-base leading-snug">
                {d.trecho}
              </blockquote>

              {d.motivo && (
                <p className="mt-2 text-sm text-hu-muted">
                  Motivo: <span className="text-hu-text">{d.motivo}</span>
                </p>
              )}

              {confirmandoId === d.id ? (
                <ConfirmacaoInline
                  pergunta="Arquivar sem apagar o conteúdo?"
                  rotuloConfirmar="Sim, arquivar"
                  rotuloConfirmando="Arquivando…"
                  confirmando={arquivar.isPending}
                  aoConfirmar={() =>
                    arquivar.mutate(d.id, { onSuccess: () => setConfirmandoId(null) })
                  }
                  aoCancelar={() => setConfirmandoId(null)}
                />
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {d.post_id != null && (
                    <Button
                      asChild
                      className="h-11 flex-1 gap-2 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
                    >
                      <Link to={`/forum/${d.post_id}`}>
                        Ver no fórum
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setConfirmandoId(d.id)}
                    className="h-11 flex-1 rounded-xl border-2 border-hu-soft bg-transparent font-bold text-hu-text hover:bg-black/5"
                  >
                    Arquivar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {arquivar.isError && (
        <Aviso variante="erro" className="mt-4">
          {arquivar.error.message}
        </Aviso>
      )}

      <p className="mt-4 px-1 text-sm text-hu-muted">
        Arquivar só tira a denúncia da fila. Para apagar o conteúdo, abra no fórum e
        use o botão de apagar.
      </p>
    </div>
  )
}
