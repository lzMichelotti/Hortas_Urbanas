import { useState } from "react"
import { Link } from "react-router"
import { Dialog } from "radix-ui"
import { Maximize2, X } from "lucide-react"
import { useHortas } from "@/features/hortas/use-hortas"
import { usePedidosAdmin } from "@/features/admin/use-painel-admin"
import { useUsuarios } from "@/features/usuarios/use-usuarios"
import { MolduraCanteiro } from "@/features/canteiro/decoracoes"
import { TERRA } from "@/features/canteiro/terra"
import { Plantinha, type Estagio } from "@/components/plantinha"
import { Carregando, FalhaAoCarregar } from "@/components/feedback"

type Horta = NonNullable<ReturnType<typeof useHortas>["data"]>[number]
interface Situacao {
  abertas: number
  andamento: number
}

// Variedade decorativa, como a roça da maquete — o estágio não significa nada.
const ESTAGIOS: Estagio[] = ["crescendo", "pronta", "broto", "quase", "semente"]

function HortaNaRoca({
  horta,
  situacao,
  lider,
  estagio,
  detalhado,
}: {
  horta: Horta
  situacao: Situacao
  lider?: string
  estagio: Estagio
  detalhado?: boolean
}) {
  const atencao = situacao.abertas > 0
  return (
    <div className="flex flex-col items-center gap-1">
      <Plantinha estagio={estagio} className="size-12" />
      <span
        className={`max-w-full truncate rounded px-1.5 text-[11px] font-bold text-white ${
          atencao ? "bg-amber-500/90" : "bg-black/50"
        }`}
      >
        {horta.nome}
      </span>
      {detalhado && (
        <>
          <span className={`text-[11px] ${lider ? "text-white/90" : "italic text-white/60"}`}>
            {lider ?? "sem líder"}
          </span>
          <span
            className={`rounded px-1.5 text-[11px] font-bold text-white ${
              atencao ? "bg-amber-500/90" : "bg-black/45"
            }`}
          >
            {atencao
              ? `📦 ${situacao.abertas} pedindo ajuda`
              : situacao.andamento > 0
                ? `🔄 ${situacao.andamento} em andamento`
                : "tudo em dia"}
          </span>
        </>
      )}
    </div>
  )
}

export function MunicipioVitrine() {
  const [aberta, setAberta] = useState(false)
  const hortas = useHortas()
  const pedidos = usePedidosAdmin()
  const usuarios = useUsuarios()

  if (hortas.isPending || pedidos.isPending || usuarios.isPending) return <Carregando />
  if (hortas.isLoadingError) {
    return <FalhaAoCarregar />
  }

  const lista = hortas.data ?? []

  if (lista.length === 0) {
    return (
      <div className="rounded-2xl border-4 border-hu-bright bg-hu-panel p-6 text-center text-hu-text">
        <p>Nenhuma horta cadastrada ainda.</p>
        <Link
          to="/painel/cadastrar"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[#5b3a1a] bg-hu-bright px-4 font-pixel text-xs leading-tight text-hu-bg shadow-[0_3px_0_#5b3a1a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
        >
          Cadastrar horta
        </Link>
      </div>
    )
  }

  const liderDe = new Map(
    (usuarios.data ?? [])
      .filter((u) => u.privilegio === "LIDER_HORTA" && u.horta_id != null)
      .map((u) => [u.horta_id as number, u.nome.split(" ")[0]]),
  )
  const porHorta = new Map<number, Situacao>()
  for (const d of pedidos.data ?? []) {
    const atual = porHorta.get(d.horta_id) ?? { abertas: 0, andamento: 0 }
    if (d.status === "ABERTA") atual.abertas++
    else if (d.status === "EM_ATENDIMENTO") atual.andamento++
    porHorta.set(d.horta_id, atual)
  }
  const totalAbertas = [...porHorta.values()].reduce((soma, p) => soma + p.abertas, 0)

  // Quem precisa de atenção primeiro: o fim da roça fica abaixo da dobra.
  const conta = (id: number) => porHorta.get(id) ?? { abertas: 0, andamento: 0 }
  const ordenadas = [...lista].sort(
    (a, b) => conta(b.id).abertas - conta(a.id).abertas || conta(b.id).andamento - conta(a.id).andamento,
  )

  const roca = (detalhado: boolean) => (
    <div
      className={`grid gap-x-2 gap-y-4 rounded-2xl border-[6px] border-[#5b3a1a] p-4 shadow-inner [image-rendering:pixelated] ${
        detalhado ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3 sm:grid-cols-4"
      }`}
      style={TERRA}
    >
      {ordenadas.map((h, i) => {
        const planta = (
          <HortaNaRoca
            horta={h}
            situacao={conta(h.id)}
            lider={liderDe.get(h.id)}
            estagio={ESTAGIOS[i % ESTAGIOS.length]}
            detalhado={detalhado}
          />
        )
        // Só a roça em tela cheia é clicável — a miniatura atrás do botão é
        // decorativa (aria-hidden) e não pode virar um link invisível ao toque.
        return detalhado ? (
          <Dialog.Close asChild key={h.id}>
            <Link
              to={`/painel/hortas/${h.id}`}
              aria-label={`Ver a horta ${h.nome}`}
              className="rounded-xl p-1 transition-transform hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/80"
            >
              {planta}
            </Link>
          </Dialog.Close>
        ) : (
          <div key={h.id}>{planta}</div>
        )
      })}
    </div>
  )

  return (
    <Dialog.Root open={aberta} onOpenChange={setAberta}>
      <div className="relative mx-auto w-full max-w-md">
        <div
          aria-hidden
          className="pointer-events-none max-h-[46svh] overflow-hidden rounded-2xl opacity-90 blur-[2px]"
        >
          <MolduraCanteiro>{roca(false)}</MolduraCanteiro>
        </div>

        <Dialog.Trigger asChild>
          <button
            aria-label="Ver todas as hortas"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/15 transition-colors hover:bg-black/25 active:bg-black/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/70"
          >
            <span className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#5b3a1a] bg-hu-panel px-4 py-2.5 text-center font-pixel text-[11px] leading-tight text-hu-text shadow-[0_3px_0_#5b3a1a]">
              <Maximize2 className="size-4 shrink-0 text-hu-bright" aria-hidden />
              Ver as hortas
            </span>
          </button>
        </Dialog.Trigger>

        {totalAbertas > 0 && (
          <span className="pointer-events-none absolute right-1 top-1 rounded-full border-2 border-white bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
            📦 {totalAbertas} pedindo ajuda
          </span>
        )}
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="hu-folha-overlay fixed inset-0 z-[1200] bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[1200] flex flex-col bg-hu-bg"
        >
          <header className="flex items-center justify-between border-b-4 border-hu-bright bg-hu-panel px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <Dialog.Title className="font-pixel text-sm text-hu-bright">Hortas do município</Dialog.Title>
            <Dialog.Close
              aria-label="Fechar"
              className="flex size-11 items-center justify-center rounded-lg text-hu-text hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-2xl">
              <MolduraCanteiro etiqueta="Hortas">{roca(true)}</MolduraCanteiro>

              <p className="mt-3 text-center text-sm text-hu-muted">
                Toque numa horta para ver os dados dela.
              </p>

              <div className="mt-6 flex justify-center">
                <Link
                  to="/painel/hortas"
                  onClick={() => setAberta(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[#5b3a1a] bg-hu-bright px-4 font-pixel text-xs leading-tight text-hu-bg shadow-[0_3px_0_#5b3a1a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                >
                  Gerenciar hortas
                </Link>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
