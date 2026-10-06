import { useState } from "react"
import { useMe } from "@/features/auth/use-me"
import { useHorta } from "@/features/hortas/use-hortas"
import { useProdutividade } from "@/features/canteiros/use-produtividade"
import { bandeiraDoCanteiro } from "@/features/canteiros/bandeira"
import { HortaGrade } from "@/features/hortas/horta-grade"
import { FolhaCanteiro } from "@/features/hortas/folha-canteiro"
import { DetalhesDaHorta } from "@/features/hortas/detalhes-horta"
import { MolduraCanteiro } from "@/features/canteiro/decoracoes"
import { Voltar } from "@/components/voltar"
import { Carregando, EstadoVazio, FalhaAoCarregar, TelaFalhaAoCarregar } from "@/components/feedback"

export function MinhaHortaPage() {
  const me = useMe()
  const hortaId = me.data?.horta_id ?? null
  const horta = useHorta(hortaId)
  const produtividade = useProdutividade(hortaId)

  const [abertoId, setAbertoId] = useState<number | null>(null)

  if (me.isPending) return <Carregando />

  if (hortaId == null) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <p className="mt-6 rounded-2xl border-4 border-hu-soft bg-hu-panel p-8 text-center text-hu-text">
          Você ainda não está vinculado a uma horta. Fale com a administração.
        </p>
      </div>
    )
  }

  if (horta.isPending) return <Carregando />
  if (horta.isLoadingError || !horta.data) {
    return <TelaFalhaAoCarregar />
  }

  const h = horta.data
  const rows = produtividade.data ?? []
  const precisamAtencao = rows.filter((c) => bandeiraDoCanteiro(c) !== "verde").length
  const aberta = rows.find((c) => c.canteiro_id === abertoId) ?? null

  const veredito = produtividade.isPending
    ? "Vendo como está sua horta…"
    : precisamAtencao === 0
      ? "Tudo em dia! 🌱"
      : `${precisamAtencao} ${precisamAtencao === 1 ? "canteiro precisa" : "canteiros precisam"} de você hoje!`

  return (
    <div className="mx-auto max-w-2xl pb-4">
      <Voltar />

      {produtividade.isLoadingError ? (
        <FalhaAoCarregar className="mt-6" />
      ) : rows.length === 0 && !produtividade.isPending ? (
        <EstadoVazio ilustracao="/personagem-idoso.webp">
          Nenhum canteiro ainda. Crie canteiros em <strong>Membros</strong> para acompanhar a horta.
        </EstadoVazio>
      ) : (
        <>
          <div className="mt-4 flex items-start gap-3">
            <img
              src="/personagem-idoso.webp"
              alt=""
              width={72}
              height={72}
              className="size-16 shrink-0 object-contain sm:size-20"
            />
            <div className="relative flex-1 rounded-2xl border-4 border-hu-bright bg-hu-panel px-4 py-3 text-hu-text">
              <span
                aria-hidden
                className="absolute -left-2.5 top-5 size-3 rotate-45 border-b-4 border-l-4 border-hu-bright bg-hu-panel"
              />
              <p className="text-base font-bold leading-snug">{veredito}</p>
            </div>
          </div>

          <div className="mt-4">
            <MolduraCanteiro etiqueta={h.nome}>
              <HortaGrade aoTocar={setAbertoId} />
            </MolduraCanteiro>
          </div>

          <p className="mt-3 text-center text-sm text-hu-muted">
            Toque num canteiro para ver o que está acontecendo nele.
          </p>

        </>
      )}

      <FolhaCanteiro canteiro={aberta} aoFechar={() => setAbertoId(null)} />

      <DetalhesDaHorta />
    </div>
  )
}
