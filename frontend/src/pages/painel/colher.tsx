import { useState } from "react"
import { useMeuCanteiro } from "@/features/canteiro/use-meu-canteiro"
import { SemCanteiro } from "@/features/canteiro/sem-canteiro"
import { useCiclos, useColher } from "@/features/ciclos/use-ciclos"
import { useNomeProduto } from "@/features/produtos/use-nome-produto"
import { SpriteProduto } from "@/features/produtos/sprite-produto"
import { Voltar } from "@/components/voltar"
import { dataBR as fmt } from "@/features/ciclos/status"
import { Button } from "@/components/ui/button"
import { Aviso, Carregando, EstadoVazio } from "@/components/feedback"


export function ColherPage() {
  const canteiro = useMeuCanteiro()
  const ciclos = useCiclos(canteiro.data?.id)
  const colher = useColher(canteiro.data?.id ?? 0)
  const nomeProduto = useNomeProduto()
  const [colhido, setColhido] = useState<string | null>(null)

  if (canteiro.isPending) return <Carregando />
  if (canteiro.isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <Aviso variante="erro" className="mt-6" aoTentarNovamente={() => canteiro.refetch()}>
          Não foi possível carregar agora. Veja sua internet e tente de novo.
        </Aviso>
      </div>
    )
  }
  if (!canteiro.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <SemCanteiro className="mt-6" />
      </div>
    )
  }
  if (ciclos.isPending) return <Carregando />

  const prontos = (ciclos.data ?? []).filter((c) => c.status === "PRONTO_PARA_COLHEITA")

  return (
    <div className="mx-auto max-w-2xl">
      <Voltar />
      <h1 className="mt-4 flex items-center gap-2 font-pixel text-sm text-hu-bright">
        <img src="/colher.png" alt="" className="size-8 [image-rendering:pixelated]" />
        Colher — {canteiro.data.identificacao}
      </h1>

      {colhido && (
        <p role="status" className="hu-pop mt-4 flex items-center justify-center gap-3 rounded-xl border-2 border-hu-bright/60 bg-hu-bright/15 px-4 py-3 text-center text-hu-text">
          <img src="/colher.png" alt="" className="size-10 [image-rendering:pixelated]" />
          <span className="font-bold">{colhido} colhido! 🧺</span>
        </p>
      )}

      {prontos.length === 0 ? (
        <EstadoVazio ilustracao="/personagem-idoso.webp">
          Nenhuma planta pronta pra colher. Vá no <strong>Calendário</strong> para atualizar o estado das suas plantas.
        </EstadoVazio>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {prontos.map((c) => {
            const colhendoEste = colher.isPending && colher.variables === c.id
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-4 text-hu-text"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <SpriteProduto nome={nomeProduto(c.produto_id)} className="size-10 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold">{nomeProduto(c.produto_id)}</p>
                    <p className="text-sm text-hu-muted">
                      Plantado em {fmt(c.data_plantio)} · previsão {fmt(c.previsao_colheita)}
                      {c.quantidade ? ` · ${c.quantidade} un.` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() =>
                    colher.mutate(c.id, {
                      onSuccess: () => setColhido(nomeProduto(c.produto_id)),
                    })
                  }
                  disabled={colher.isPending}
                  className="h-12 shrink-0 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
                >
                  {colhendoEste ? "Colhendo…" : "Colher 🧺"}
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {colher.isError && (
        <Aviso variante="erro" className="mt-4">
          {colher.error.message}
        </Aviso>
      )}
    </div>
  )
}
