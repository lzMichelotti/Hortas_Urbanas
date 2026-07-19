import { Link } from "react-router"
import { ChevronRight, Plus } from "lucide-react"
import { useHortas } from "@/features/hortas/use-hortas"
import { useDemandas } from "@/features/demandas/use-demandas"
import { useUsuarios } from "@/features/usuarios/use-usuarios"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import { Plantinha, type Estagio } from "@/components/plantinha"
import { Aviso, Carregando } from "@/components/feedback"

// Variedade decorativa, como a roça da home — o estágio não significa nada.
const ESTAGIOS: Estagio[] = ["crescendo", "pronta", "broto", "quase", "semente"]

export function HortasPage() {
  const hortas = useHortas()
  const demandas = useDemandas()
  const usuarios = useUsuarios()

  if (hortas.isPending) return <Carregando />

  if (hortas.isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <Aviso variante="erro" className="mt-6" aoTentarNovamente={() => hortas.refetch()}>
          Não foi possível carregar as hortas. Veja sua internet e tente de novo.
        </Aviso>
      </div>
    )
  }

  const lista = hortas.data ?? []
  const liderDe = new Map(
    (usuarios.data ?? [])
      .filter((u) => u.privilegio === "LIDER_HORTA" && u.horta_id != null)
      .map((u) => [u.horta_id as number, u.nome.split(" ")[0]]),
  )
  const porHorta = new Map<number, { abertas: number; andamento: number }>()
  for (const d of demandas.data ?? []) {
    const atual = porHorta.get(d.horta_id) ?? { abertas: 0, andamento: 0 }
    if (d.status === "ABERTA") atual.abertas++
    else if (d.status === "EM_ATENDIMENTO") atual.andamento++
    porHorta.set(d.horta_id, atual)
  }
  const conta = (id: number) => porHorta.get(id) ?? { abertas: 0, andamento: 0 }
  const ordenadas = [...lista].sort(
    (a, b) => conta(b.id).abertas - conta(a.id).abertas || conta(b.id).andamento - conta(a.id).andamento,
  )

  return (
    <div className="mx-auto max-w-2xl">
      <Voltar />

      <div className="mt-4 flex items-center justify-between gap-3">
        <h1 className="font-pixel text-sm text-hu-bright">
          Hortas {lista.length > 0 && <span className="text-hu-muted">({lista.length})</span>}
        </h1>
        <Button asChild className="gap-2 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90">
          <Link to="/painel/cadastrar">
            <Plus className="size-4" aria-hidden />
            Cadastrar
          </Link>
        </Button>
      </div>

      {lista.length === 0 ? (
        <p className="mt-4 rounded-2xl border-4 border-hu-soft bg-hu-panel p-6 text-center text-sm text-hu-muted">
          Nenhuma horta cadastrada. Toque em "Cadastrar" para começar.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {ordenadas.map((h, i) => {
            const c = conta(h.id)
            const lider = liderDe.get(h.id)
            const atencao = c.abertas > 0
            const situacao = atencao
              ? `📦 ${c.abertas} pedindo ajuda`
              : c.andamento > 0
                ? `🔄 ${c.andamento} em andamento`
                : "tudo em dia"
            return (
              <li key={h.id}>
                <Link
                  to={`/painel/hortas/${h.id}`}
                  className="flex items-center gap-3 rounded-2xl border-2 border-hu-soft bg-hu-panel p-3 text-hu-text transition-colors hover:border-hu-bright focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hu-bright/50"
                >
                  <Plantinha estagio={ESTAGIOS[i % ESTAGIOS.length]} className="size-10 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{h.nome}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
                      <span className={lider ? "text-hu-muted" : "italic text-hu-muted"}>
                        {lider ?? "sem líder"}
                      </span>
                      <span className="text-hu-muted" aria-hidden>·</span>
                      <span className={atencao ? "font-bold text-amber-500" : "text-hu-muted"}>{situacao}</span>
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-hu-muted" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
