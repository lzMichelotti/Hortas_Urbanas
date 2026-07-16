import { Link } from "react-router"
import { useCanteiros } from "@/features/canteiros/use-canteiros"
import { useCiclosDaHorta } from "@/features/ciclos/use-ciclos"
import { useUsuarios } from "@/features/usuarios/use-usuarios"
import { TERRA } from "@/features/canteiro/terra"
import { Aviso, Carregando } from "@/components/feedback"

const CRESCENDO = ["PLANTADO", "EM_CRESCIMENTO"]

export function HortaVitrine() {
  const canteiros = useCanteiros()
  const usuarios = useUsuarios()
  const lista = canteiros.data ?? []
  const producao = useCiclosDaHorta(lista.map((c) => c.id))

  if (canteiros.isPending || producao.isPending) return <Carregando />
  if (canteiros.isError) {
    return (
      <Aviso variante="erro" aoTentarNovamente={() => canteiros.refetch()}>
        Não foi possível carregar sua horta. Veja sua internet e tente de novo.
      </Aviso>
    )
  }

  if (lista.length === 0) {
    return (
      <div className="rounded-2xl border-4 border-hu-bright bg-hu-panel p-6 text-center text-hu-text">
        <p>Sua horta ainda não tem canteiros.</p>
        <Link
          to="/painel/membros"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[#5b3a1a] bg-hu-bright px-4 font-pixel text-xs leading-tight text-hu-bg shadow-[0_3px_0_#5b3a1a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
        >
          Criar canteiros
        </Link>
      </div>
    )
  }

  const nomeDe = new Map((usuarios.data ?? []).map((u) => [u.id, u.nome.split(" ")[0]]))
  const porCanteiro = new Map<number, { prontas: number; crescendo: number }>()
  for (const c of producao.ciclos) {
    const atual = porCanteiro.get(c.canteiro_id) ?? { prontas: 0, crescendo: 0 }
    if (c.status === "PRONTO_PARA_COLHEITA") atual.prontas++
    else if (CRESCENDO.includes(c.status ?? "")) atual.crescendo++
    porCanteiro.set(c.canteiro_id, atual)
  }
  const totalProntas = [...porCanteiro.values()].reduce((soma, p) => soma + p.prontas, 0)

  return (
    <div className="relative mx-auto w-full max-w-md">
      <Link
        to="/painel/horta"
        className="block rounded-2xl border-[6px] border-[#5b3a1a] p-3 shadow-inner transition-transform [image-rendering:pixelated] hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/70"
        style={TERRA}
      >
        <div className="grid grid-cols-2 gap-2">
          {lista.map((c) => {
            const p = porCanteiro.get(c.id) ?? { prontas: 0, crescendo: 0 }
            const responsavel = c.usuario_id != null ? (nomeDe.get(c.usuario_id) ?? "") : "vazio"
            return (
              <div key={c.id} className="flex flex-col items-center gap-0.5 rounded-lg bg-black/30 px-2 py-2">
                <span className="w-full truncate text-center text-sm font-bold text-white">{c.identificacao}</span>
                <span className={`text-[11px] ${c.usuario_id == null ? "italic text-white/60" : "text-white/85"}`}>
                  {responsavel}
                </span>
                <span
                  className={`rounded px-1.5 text-[11px] font-bold text-white ${
                    p.prontas > 0 ? "bg-amber-500/90" : "bg-black/45"
                  }`}
                >
                  {p.prontas > 0
                    ? `🧺 ${p.prontas} pronta${p.prontas > 1 ? "s" : ""}`
                    : p.crescendo > 0
                      ? `🌱 ${p.crescendo} crescendo`
                      : "sem plantas"}
                </span>
              </div>
            )
          })}
        </div>

        <span className="mt-3 flex justify-center">
          <span className="rounded-xl border-2 border-[#5b3a1a] bg-hu-panel px-4 py-2.5 font-pixel text-xs leading-tight text-hu-text shadow-[0_3px_0_#5b3a1a]">
            Ver minha horta
          </span>
        </span>
      </Link>

      {totalProntas > 0 && (
        <span className="pointer-events-none absolute right-1 top-1 rounded-full border-2 border-white bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
          🧺 {totalProntas} pronta{totalProntas > 1 ? "s" : ""}
        </span>
      )}
    </div>
  )
}
