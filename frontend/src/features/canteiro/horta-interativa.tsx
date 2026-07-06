import type { ReactNode } from "react"
import { Link } from "react-router"
import { Plus } from "lucide-react"
import { useMeuCanteiro } from "@/features/canteiro/use-meu-canteiro"
import { useCiclos } from "@/features/ciclos/use-ciclos"
import { estagioDe, progresso } from "@/features/ciclos/crescimento"
import { useNomeProduto } from "@/features/produtos/use-nome-produto"
import { Aviso, Carregando } from "@/components/feedback"
import { ArtePlanta } from "@/features/produtos/sprite-produto"

type Ciclo = NonNullable<ReturnType<typeof useCiclos>["data"]>[number]

const ATIVOS = ["PLANTADO", "EM_CRESCIMENTO", "PRONTO_PARA_COLHEITA"]
const MIN_BLOCOS = 6

export const TERRA = {
  backgroundColor: "#8a5a2b",
  backgroundImage: "url(/terra-arada-64.png)",
  backgroundSize: "64px 64px",
}

const celulaClasse =
  "flex aspect-square flex-col items-center justify-end gap-1 transition-transform hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/60"

function Celula({
  to,
  rotulo,
  interativo,
  children,
}: {
  to: string
  rotulo: string
  interativo: boolean
  children: ReactNode
}) {
  if (!interativo) return <div className={celulaClasse}>{children}</div>
  return (
    <Link to={to} aria-label={rotulo} className={celulaClasse}>
      {children}
    </Link>
  )
}

function Cova({ interativo }: { interativo: boolean }) {
  return (
    <Celula to="/painel/plantar" rotulo="Canteiro vazio. Toque para plantar." interativo={interativo}>
      <span
        aria-hidden
        className="mb-1 flex size-9 items-center justify-center rounded-full bg-black/30 ring-2 ring-black/30"
      >
        <Plus className="size-5 text-hu-bright" strokeWidth={3} />
      </span>
      <span className="rounded bg-black/45 px-1.5 text-[11px] font-bold text-white">Plantar</span>
    </Celula>
  )
}

function PlantaNoCanteiro({ ciclo, nome, interativo }: { ciclo: Ciclo; nome: string; interativo: boolean }) {
  const estagio = estagioDe(ciclo)
  const pronta = estagio === "pronta"
  const p = Math.round(progresso(ciclo) * 100)
  const destino = `/painel/planta/${ciclo.id}`
  const rotulo = pronta
    ? `${nome}, pronta para colher. Toque para ver.`
    : `${nome}, crescendo, ${p}%. Toque para ver.`

  return (
    <Celula to={destino} rotulo={rotulo} interativo={interativo}>
      <span className={`flex items-end justify-center ${pronta ? "hu-pulse" : ""}`}>
        <ArtePlanta nome={nome} estagio={estagio} className="size-12" />
      </span>
      {!pronta && (
        <span aria-hidden className="h-1 w-3/4 overflow-hidden rounded-full bg-black/30">
          <span className="block h-full rounded-full bg-hu-bright" style={{ width: `${p}%` }} />
        </span>
      )}
      <span
        className={`max-w-full truncate rounded px-1.5 text-[11px] font-bold text-white ${
          pronta ? "bg-amber-500/90" : "bg-black/50"
        }`}
      >
        {pronta ? "🧺 Colher" : nome}
      </span>
    </Celula>
  )
}

export function CanteiroGrade({
  interativo = true,
  minBlocos = MIN_BLOCOS,
}: {
  interativo?: boolean
  minBlocos?: number
}) {
  const canteiro = useMeuCanteiro()
  const ciclos = useCiclos(canteiro.data?.id)
  const nomeProduto = useNomeProduto()

  if (canteiro.isPending) return <Carregando />
  if (canteiro.isError) {
    return (
      <Aviso variante="erro" className="mt-2" aoTentarNovamente={() => canteiro.refetch()}>
        Não foi possível carregar agora. Veja sua internet e tente de novo.
      </Aviso>
    )
  }
  if (!canteiro.data) {
    return (
      <p className="mt-2 rounded-2xl border-4 border-hu-bright bg-hu-panel p-8 text-center text-hu-text">
        Você ainda não tem um canteiro. Fale com o líder da sua horta.
      </p>
    )
  }

  const ativos = (ciclos.data ?? []).filter((c) => ATIVOS.includes(c.status ?? ""))
  const vazios = Math.max(2, minBlocos - ativos.length)

  return (
    <div
      className="grid grid-cols-3 gap-x-2 gap-y-4 rounded-2xl border-[6px] border-[#5b3a1a] p-4 shadow-inner [image-rendering:pixelated] sm:grid-cols-4"
      style={TERRA}
    >
        {ativos.map((c) => (
          <PlantaNoCanteiro key={c.id} ciclo={c} nome={nomeProduto(c.produto_id)} interativo={interativo} />
        ))}
        {Array.from({ length: vazios }, (_, i) => (
          <Cova key={`cova-${i}`} interativo={interativo} />
        ))}
    </div>
  )
}
