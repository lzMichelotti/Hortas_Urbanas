import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router"
import { AlertTriangle, ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock, Sprout } from "lucide-react"
import { useMeuCanteiro } from "@/features/canteiro/use-meu-canteiro"
import { useProdutos } from "@/features/produtos/use-produtos"
import { usePlantar } from "@/features/ciclos/use-ciclos"
import {
  addDias,
  dentroDaEpoca,
  estimarDiasColheita,
  formatarDiaMes,
  formatarEpoca,
} from "@/features/produtos/colheita"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Aviso, Carregando } from "@/components/feedback"
import { FalaDaGuia } from "@/components/guia"
import { type Estagio } from "@/components/plantinha"
import { ArtePlanta, SpriteProduto } from "@/features/produtos/sprite-produto"
import { CelebracaoOverlay } from "@/components/celebracao"
import { TERRA } from "@/features/canteiro/terra"

const DIAS_PADRAO_COLHEITA = 90
const CRESCIMENTO: Estagio[] = ["broto", "crescendo", "pronta"]
const hojeISO = () => new Date().toISOString().slice(0, 10)

function diasAtras(iso: string): number {
  const a = new Date(`${iso}T00:00:00`).getTime()
  const b = new Date(`${hojeISO()}T00:00:00`).getTime()
  return Math.round((b - a) / 86_400_000)
}

function rotuloDia(iso: string): string {
  const d = diasAtras(iso)
  if (d <= 0) return "Hoje"
  if (d === 1) return "Ontem"
  return `Há ${d} dias`
}

type Etapa = "produto" | "data" | "quantidade" | "fim"
const ORDEM: Etapa[] = ["produto", "data", "quantidade"]

export function PlantarPage() {
  const canteiro = useMeuCanteiro()
  const produtos = useProdutos()
  const plantar = usePlantar(canteiro.data?.id ?? 0)
  const navigate = useNavigate()

  const [etapa, setEtapa] = useState<Etapa>("produto")
  const [produtoId, setProdutoId] = useState<number | null>(null)
  const [busca, setBusca] = useState("")
  const [dataPlantio, setDataPlantio] = useState(hojeISO())
  const [quantidade, setQuantidade] = useState("1")
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [cresc, setCresc] = useState(0)
  const [celebrando, setCelebrando] = useState(false)
  const idemRef = useRef("")

  useEffect(() => {
    if (etapa !== "fim") return
    const t1 = setTimeout(() => setCresc(1), 350)
    const t2 = setTimeout(() => setCresc(2), 750)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [etapa])

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const todos = produtos.data ?? []
    return termo ? todos.filter((p) => p.nome.toLowerCase().includes(termo)) : todos
  }, [produtos.data, busca])

  const produtoSel = produtos.data?.find((p) => p.id === produtoId) ?? null
  const produtoNome = produtoSel?.nome ?? ""

  const diasColheita = estimarDiasColheita(produtoSel?.inicio_colheita)
  const minDias = diasColheita?.min ?? DIAS_PADRAO_COLHEITA
  const maxDias = diasColheita?.max ?? DIAS_PADRAO_COLHEITA
  const previsaoInicio = dataPlantio !== "" ? addDias(dataPlantio, minDias) : ""
  const previsaoFim = dataPlantio !== "" ? addDias(dataPlantio, maxDias) : ""
  const epocaTexto = formatarEpoca(produtoSel?.epoca_recomendada)
  const foraDaEpoca =
    produtoSel != null &&
    dataPlantio !== "" &&
    dentroDaEpoca(produtoSel.epoca_recomendada, new Date(`${dataPlantio}T00:00:00`)) === false

  const quantidadeNum = Number(quantidade)
  const quantidadeValida = quantidade.trim() !== "" && quantidadeNum > 0
  const podeEnviar = produtoId != null && dataPlantio !== "" && previsaoInicio !== "" && quantidadeValida

  function voltar() {
    if (etapa === "data") setEtapa("produto")
    else if (etapa === "quantidade") setEtapa("data")
    else navigate(-1)
  }

  function enviar() {
    if (!podeEnviar || produtoId == null || !canteiro.data) return
    if (!idemRef.current) idemRef.current = crypto.randomUUID()
    plantar.mutate(
      {
        idempotencyKey: idemRef.current,
        body: {
          produto_id: produtoId,
          data_plantio: dataPlantio,
          previsao_colheita: previsaoInicio,
          status: "PLANTADO",
          quantidade: quantidadeNum,
        },
      },
      {
        onSuccess: () => {
          idemRef.current = ""
          setSucesso(produtoNome)
          setCresc(0)
          setCelebrando(true)
          setEtapa("fim")
        },
      },
    )
  }

  function plantarOutra() {
    setProdutoId(null)
    setBusca("")
    setDataPlantio(hojeISO())
    setQuantidade("1")
    setSucesso(null)
    setEtapa("produto")
  }

  if (canteiro.isPending) return <Carregando />
  if (canteiro.isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Aviso variante="erro" className="mt-6" aoTentarNovamente={() => canteiro.refetch()}>
          Não foi possível carregar agora. Veja sua internet e tente de novo.
        </Aviso>
      </div>
    )
  }
  if (!canteiro.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="mt-6 rounded-2xl border-4 border-hu-bright bg-hu-panel p-8 text-center text-hu-text">
          Você ainda não tem um canteiro. Fale com o líder da sua horta.
        </p>
      </div>
    )
  }

  const idx = ORDEM.indexOf(etapa)

  return (
    <div className="mx-auto max-w-2xl">
      {etapa !== "fim" && (
        <button
          onClick={voltar}
          className="flex h-11 items-center gap-1 text-hu-muted hover:text-hu-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
        >
          <ArrowLeft className="size-5" aria-hidden />
          Voltar
        </button>
      )}

      {etapa !== "fim" && (
        <div className="mt-1 flex justify-center gap-2" aria-hidden>
          {ORDEM.map((e, i) => (
            <span
              key={e}
              className={`size-2 rounded-full ${i <= idx ? "bg-hu-bright" : "bg-hu-soft"}`}
            />
          ))}
        </div>
      )}

      <div className="mt-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5">
        {etapa === "produto" && (
          <>
            <FalaDaGuia>O que vamos plantar?</FalaDaGuia>
            <Input
              placeholder="Buscar planta…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="mt-4 h-12 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
            />
            <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-auto sm:grid-cols-3">
              {lista.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    setProdutoId(p.id)
                    setEtapa("data")
                  }}
                  className="flex items-center gap-2 rounded-lg border-2 border-hu-soft p-3 text-left text-sm text-hu-text transition-colors hover:bg-black/5 active:scale-95"
                >
                  <SpriteProduto nome={p.nome} className="size-7 shrink-0" />
                  {p.nome}
                </button>
              ))}
              {lista.length === 0 && <p className="col-span-full text-sm text-hu-muted">Nada encontrado.</p>}
            </div>
          </>
        )}

        {etapa === "data" && (
          <>
            <FalaDaGuia>Quando você plantou {produtoNome}?</FalaDaGuia>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDataPlantio(addDias(dataPlantio, -1))}
                aria-label="Um dia antes"
                className="flex size-14 shrink-0 items-center justify-center rounded-xl border-2 border-hu-soft text-hu-bright hover:bg-black/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
              >
                <ChevronLeft className="size-7" aria-hidden />
              </button>
              <div className="text-center" aria-live="polite">
                <p className="text-2xl font-bold text-hu-text">{rotuloDia(dataPlantio)}</p>
                <p className="text-sm text-hu-muted">{formatarDiaMes(dataPlantio)}</p>
              </div>
              <button
                type="button"
                onClick={() => setDataPlantio(addDias(dataPlantio, 1))}
                disabled={dataPlantio >= hojeISO()}
                aria-label="Um dia depois"
                className="flex size-14 shrink-0 items-center justify-center rounded-xl border-2 border-hu-soft text-hu-bright hover:bg-black/5 active:scale-95 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
              >
                <ChevronRight className="size-7" aria-hidden />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-2 rounded-xl border-2 border-hu-soft bg-hu-bg/50 p-3 text-sm">
              {epocaTexto && (
                <>
                  <span className="flex items-center gap-2 text-hu-text">
                    <CalendarDays className="size-4 shrink-0 text-hu-bright" aria-hidden />
                    Melhor época
                  </span>
                  <strong className="font-bold text-hu-bright">{epocaTexto}</strong>
                </>
              )}
              <span className="flex items-center gap-2 text-hu-text">
                <Clock className="size-4 shrink-0 text-hu-bright" aria-hidden />
                Colheita prevista
              </span>
              <strong className="font-bold text-hu-bright">
                {previsaoInicio === previsaoFim
                  ? formatarDiaMes(previsaoInicio)
                  : `entre ${formatarDiaMes(previsaoInicio)} e ${formatarDiaMes(previsaoFim)}`}
              </strong>
            </div>

            {foraDaEpoca && epocaTexto && (
              <p className="mt-2 flex items-center gap-2 rounded-lg border-2 border-amber-400/50 bg-amber-500/15 px-3 py-2 text-sm text-amber-700">
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                <span>A melhor época para plantar {produtoNome} é {epocaTexto}.</span>
              </p>
            )}

            <Button
              onClick={() => setEtapa("quantidade")}
              className="mt-5 h-12 w-full rounded-xl bg-hu-bright text-base font-bold text-hu-bg hover:bg-hu-bright/90"
            >
              Continuar
            </Button>
          </>
        )}

        {etapa === "quantidade" && (
          <>
            <FalaDaGuia>Quantas mudas de {produtoNome}?</FalaDaGuia>

            <Input
              id="qt"
              inputMode="numeric"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ""))}
              className="mt-4 h-14 rounded-lg border-2 border-hu-soft bg-hu-bg text-center text-2xl font-bold text-hu-text"
            />

            {plantar.isError && (
              <Aviso variante="erro" className="mt-4">
                {plantar.error.message}
              </Aviso>
            )}

            <Button
              onClick={enviar}
              disabled={!quantidadeValida || plantar.isPending}
              className="mt-5 h-14 w-full gap-2 rounded-xl bg-hu-bright text-lg font-bold text-hu-bg hover:bg-hu-bright/90"
            >
              <Sprout className="size-5" aria-hidden />
              {plantar.isPending ? "Plantando…" : `Plantar ${produtoNome}`}
            </Button>
          </>
        )}

        {etapa === "fim" && (
          <>
            <FalaDaGuia humor="feliz">{sucesso} plantado! 🌱 Já está no seu canteiro.</FalaDaGuia>

            <div
              className="mt-4 flex h-36 items-end justify-center overflow-hidden rounded-xl border-2 border-[#5b3a1a] [image-rendering:pixelated]"
              style={TERRA}
            >
              <span key={cresc} className="hu-pop mb-3">
                <ArtePlanta nome={sucesso} estagio={CRESCIMENTO[cresc]} className="size-28" />
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <Button
                asChild
                className="h-12 w-full rounded-xl bg-hu-bright text-base font-bold text-hu-bg hover:bg-hu-bright/90"
              >
                <Link to="/painel" state={{ abrirCanteiro: true }}>Ver meu canteiro</Link>
              </Button>
              <Button
                onClick={plantarOutra}
                variant="outline"
                className="h-12 w-full rounded-xl border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
              >
                Plantar outra
              </Button>
            </div>
          </>
        )}
      </div>

      {celebrando && sucesso && (
        <CelebracaoOverlay nome={sucesso} onDismiss={() => setCelebrando(false)} />
      )}
    </div>
  )
}
