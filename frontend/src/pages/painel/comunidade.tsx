import { useMemo, useRef, useState } from "react"
import { ArrowLeft, ChevronRight, Minus, Pencil, Plus, RotateCw, Send, Trash2 } from "lucide-react"
import { useMeuCanteiro } from "@/features/canteiro/use-meu-canteiro"
import { SemCanteiro } from "@/features/canteiro/sem-canteiro"
import { useProdutos } from "@/features/produtos/use-produtos"
import { useNomeProduto } from "@/features/produtos/use-nome-produto"
import {
  useCancelarSolicitacao,
  useCriarSolicitacao,
  useSolicitacoesDoMembro,
} from "@/features/solicitacoes/use-solicitacoes"
import {
  useCancelarDemandaMembro,
  useCriarDemandaMembro,
  useDemandasDoMembro,
} from "@/features/demandas/use-demandas"
import {
  CATEGORIAS_MATERIAL,
  type CategoriaMaterial,
  type ItemMaterial,
} from "@/features/demandas/catalogo-materiais"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Aviso, Carregando, EstadoVazio } from "@/components/feedback"
import { FalaDaGuia } from "@/components/guia"
import { ConfirmacaoInline } from "@/components/confirmar"
import { CelebracaoOverlay } from "@/components/celebracao"
import type { components } from "@/lib/api/schema"

type StatusPedido = components["schemas"]["StatusPedido"]
type Demanda = components["schemas"]["DemandaRead"]
type Solicitacao = components["schemas"]["SolicitacaoRead"]

type Chip = { rotulo: string; ponto: string; chip: string }

const STATUS: Record<StatusPedido, Chip> = {
  ABERTA: { rotulo: "Esperando", ponto: "bg-amber-400", chip: "bg-amber-400 text-black" },
  EM_ATENDIMENTO: { rotulo: "Preparando", ponto: "bg-sky-400", chip: "bg-sky-400 text-black" },
  ATENDIDA: { rotulo: "Pronto ✓", ponto: "bg-hu-bright", chip: "bg-hu-bright text-hu-bg" },
  CANCELADA: { rotulo: "Recusado", ponto: "bg-red-400", chip: "bg-red-500 text-white" },
}

type Etapa = "lista" | "categoria" | "planta" | "item" | "livre" | "quantidade" | "revisao" | "fim"
const PASSOS_PLANTIO: Etapa[] = ["categoria", "planta", "quantidade", "revisao"]
const PASSOS_MATERIAL: Etapa[] = ["categoria", "item", "quantidade", "revisao"]

const cardClasse =
  "flex flex-col items-center gap-2 rounded-xl border-2 border-hu-soft p-4 text-center text-hu-text transition-transform hover:-translate-y-0.5 hover:bg-black/5 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/60"

function ChipStatus({ info }: { info: Chip }) {
  return (
    <span className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold ${info.chip}`}>
      <span className={`size-2 rounded-full ${info.ponto}`} aria-hidden />
      {info.rotulo}
    </span>
  )
}

export function ComunidadePage() {
  const canteiro = useMeuCanteiro()
  const canteiroId = canteiro.data?.id
  const produtos = useProdutos()
  const nomeProduto = useNomeProduto()

  const solicitacoes = useSolicitacoesDoMembro(canteiroId)
  const criarPlanta = useCriarSolicitacao(canteiroId ?? 0)
  const cancelarPlanta = useCancelarSolicitacao(canteiroId ?? 0)

  const demandas = useDemandasDoMembro(canteiroId)
  const criarMaterial = useCriarDemandaMembro(canteiroId ?? 0)
  const cancelarMaterial = useCancelarDemandaMembro(canteiroId ?? 0)

  const idemRef = useRef("")

  const [etapa, setEtapa] = useState<Etapa>("lista")
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [produtoId, setProdutoId] = useState<number | null>(null)
  const [descricao, setDescricao] = useState("")
  const [unidade, setUnidade] = useState("")
  const [quantidade, setQuantidade] = useState(1)
  const [textoLivre, setTextoLivre] = useState("")
  const [busca, setBusca] = useState("")
  const [confirmarCancelar, setConfirmarCancelar] = useState<string | null>(null)
  const [celebrando, setCelebrando] = useState(false)
  const [sucessoNome, setSucessoNome] = useState("")

  const categoria = CATEGORIAS_MATERIAL.find((c) => c.id === categoriaId) ?? null
  const ehPlantio = categoria?.fonte === "plantio"
  const produtoNome = produtos.data?.find((p) => p.id === produtoId)?.nome ?? ""

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const todos = produtos.data ?? []
    return termo ? todos.filter((p) => p.nome.toLowerCase().includes(termo)) : todos
  }, [produtos.data, busca])

  function reiniciar() {
    setCategoriaId(null)
    setProdutoId(null)
    setDescricao("")
    setUnidade("")
    setQuantidade(1)
    setTextoLivre("")
    setBusca("")
    idemRef.current = ""
    criarPlanta.reset()
    criarMaterial.reset()
  }

  function celebrar(nome: string) {
    setSucessoNome(nome)
    setCelebrando(true)
    setEtapa("fim")
  }

  function escolherCategoria(c: CategoriaMaterial) {
    setCategoriaId(c.id)
    setUnidade(c.unidadePadrao)
    if (c.fonte === "plantio") {
      setProdutoId(null)
      setBusca("")
      setEtapa("planta")
    } else if (c.fonte === "livre") {
      setTextoLivre("")
      setEtapa("livre")
    } else {
      setEtapa("item")
    }
  }

  function escolherProduto(id: number, nome: string) {
    setProdutoId(id)
    setDescricao(nome)
    setUnidade("mudas")
    setQuantidade(1)
    setEtapa("quantidade")
  }

  function escolherItem(item: ItemMaterial) {
    setDescricao(item.rotulo)
    setUnidade(item.unidade)
    setQuantidade(1)
    setEtapa("quantidade")
  }

  function confirmarLivre() {
    const texto = textoLivre.trim()
    if (!texto) return
    setDescricao(texto)
    setUnidade(categoria?.unidadePadrao ?? "unidades")
    setQuantidade(1)
    setEtapa("quantidade")
  }

  function voltarEtapa() {
    if (etapa === "planta" || etapa === "item" || etapa === "livre") setEtapa("categoria")
    else if (etapa === "quantidade") setEtapa(ehPlantio ? "planta" : categoria?.fonte === "livre" ? "livre" : "item")
    else if (etapa === "revisao") setEtapa(ehPlantio ? "planta" : "quantidade")
    else setEtapa("lista")
  }

  function enviar() {
    if (!categoria) return
    if (ehPlantio) {
      if (produtoId == null) return
      if (!idemRef.current) idemRef.current = crypto.randomUUID()
      criarPlanta.mutate(
        { body: { produto_id: produtoId, quantidade }, idempotencyKey: idemRef.current },
        {
          onSuccess: () => {
            idemRef.current = ""
            celebrar(produtoNome)
          },
        },
      )
    } else {
      if (!idemRef.current) idemRef.current = crypto.randomUUID()
      criarMaterial.mutate(
        {
          body: {
            tipo_demanda: categoria.rotulo,
            descricao,
            quantidade,
            unidade_medida: unidade,
          },
          idempotencyKey: idemRef.current,
        },
        {
          onSuccess: () => {
            idemRef.current = ""
            celebrar(descricao)
          },
        },
      )
    }
  }

  function repetirPlanta(s: Solicitacao) {
    if (s.produto_id == null) return
    criarPlanta.mutate({
      body: { produto_id: s.produto_id, quantidade: s.quantidade },
      idempotencyKey: crypto.randomUUID(),
    })
  }

  function repetirMaterial(d: Demanda) {
    criarMaterial.mutate({
      body: {
        tipo_demanda: d.tipo_demanda,
        descricao: d.descricao,
        quantidade: d.quantidade,
        unidade_medida: d.unidade_medida,
      },
      idempotencyKey: crypto.randomUUID(),
    })
  }

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

  // ---- Assistente (um pedido novo) ----
  if (etapa !== "lista") {
    const passos = ehPlantio ? PASSOS_PLANTIO : PASSOS_MATERIAL
    const idxPasso = passos.indexOf(etapa === "livre" ? "item" : etapa)
    const enviando = ehPlantio ? criarPlanta.isPending : criarMaterial.isPending
    const erroEnvio = ehPlantio ? criarPlanta.error : criarMaterial.error

    return (
      <div className="mx-auto max-w-2xl">
        {etapa !== "fim" && (
          <button
            onClick={voltarEtapa}
            className="-m-2 inline-flex items-center gap-2 rounded-lg p-2 text-base font-medium text-hu-bright transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hu-bright/50"
          >
            <ArrowLeft className="size-5" aria-hidden />
            Voltar
          </button>
        )}

        {etapa !== "fim" && (
          <div className="mt-1 flex justify-center gap-2" aria-hidden>
            {passos.map((p, i) => (
              <span key={p} className={`size-2 rounded-full ${i <= idxPasso ? "bg-hu-bright" : "bg-hu-soft"}`} />
            ))}
          </div>
        )}

        <div className="mt-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5">
          {etapa === "categoria" && (
            <>
              <FalaDaGuia>O que você precisa para o seu canteiro?</FalaDaGuia>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {CATEGORIAS_MATERIAL.map((c) => {
                  const Icone = c.Icone
                  return (
                    <button key={c.id} type="button" onClick={() => escolherCategoria(c)} className={cardClasse}>
                      <Icone className="size-9 text-hu-bright" strokeWidth={2.5} aria-hidden />
                      <span className="text-sm font-bold leading-tight">{c.rotulo}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {etapa === "planta" && (
            <>
              <FalaDaGuia>Qual planta você quer plantar?</FalaDaGuia>
              <Input
                placeholder="Buscar planta…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="mt-4 h-12 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
              />
              {produtos.isPending ? (
                <Carregando className="mt-3" />
              ) : produtos.isError ? (
                <Aviso variante="erro" className="mt-3" aoTentarNovamente={() => produtos.refetch()}>
                  Não consegui carregar a lista de plantas.
                </Aviso>
              ) : (
                <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-auto sm:grid-cols-3">
                  {produtosFiltrados.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => escolherProduto(p.id, p.nome)}
                      className="rounded-lg border-2 border-hu-soft p-3 text-left text-sm text-hu-text transition-colors hover:bg-black/5 active:scale-95"
                    >
                      {p.nome}
                    </button>
                  ))}
                  {produtosFiltrados.length === 0 && (
                    <p className="col-span-full text-sm text-hu-muted">Nada encontrado.</p>
                  )}
                </div>
              )}
            </>
          )}

          {etapa === "item" && categoria && categoria.fonte === "lista" && (
            <>
              <FalaDaGuia>Qual {categoria.rotulo.toLowerCase()}?</FalaDaGuia>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {categoria.itens.map((item) => {
                  const Icone = item.Icone
                  return (
                    <button key={item.id} type="button" onClick={() => escolherItem(item)} className={cardClasse}>
                      <Icone className="size-9 text-hu-bright" strokeWidth={2.5} aria-hidden />
                      <span className="text-sm font-bold leading-tight">{item.rotulo}</span>
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => {
                    setTextoLivre("")
                    setEtapa("livre")
                  }}
                  className={cardClasse}
                >
                  <Pencil className="size-9 text-hu-muted" strokeWidth={2.5} aria-hidden />
                  <span className="text-sm font-bold leading-tight">Outro</span>
                </button>
              </div>
            </>
          )}

          {etapa === "livre" && (
            <>
              <FalaDaGuia>Escreva o que você precisa:</FalaDaGuia>
              <Input
                autoFocus
                placeholder="Ex: tela de sombreamento"
                value={textoLivre}
                onChange={(e) => setTextoLivre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmarLivre()}
                className="mt-4 h-12 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
              />
              <Button
                onClick={confirmarLivre}
                disabled={!textoLivre.trim()}
                className="mt-5 h-12 w-full gap-2 rounded-xl bg-hu-bright text-base font-bold text-hu-bg hover:bg-hu-bright/90"
              >
                Continuar
                <ChevronRight className="size-5" aria-hidden />
              </Button>
            </>
          )}

          {etapa === "quantidade" && (
            <>
              <FalaDaGuia>Quantos você precisa?</FalaDaGuia>
              <p className="mt-2 text-center text-base font-bold text-hu-text">{descricao}</p>

              <div className="mt-4 flex items-center justify-center gap-5">
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  disabled={quantidade <= 1}
                  aria-label="Diminuir"
                  className="flex size-14 shrink-0 items-center justify-center rounded-xl border-2 border-hu-soft text-hu-bright hover:bg-black/5 active:scale-95 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
                >
                  <Minus className="size-7" aria-hidden />
                </button>
                <div className="text-center" aria-live="polite">
                  <p className="text-4xl font-bold text-hu-text">{quantidade}</p>
                  <p className="text-sm text-hu-muted">{unidade}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.min(999, q + 1))}
                  aria-label="Aumentar"
                  className="flex size-14 shrink-0 items-center justify-center rounded-xl border-2 border-hu-soft text-hu-bright hover:bg-black/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
                >
                  <Plus className="size-7" aria-hidden />
                </button>
              </div>

              <Button
                onClick={() => setEtapa("revisao")}
                className="mt-6 h-12 w-full gap-2 rounded-xl bg-hu-bright text-base font-bold text-hu-bg hover:bg-hu-bright/90"
              >
                Continuar
                <ChevronRight className="size-5" aria-hidden />
              </Button>
            </>
          )}

          {etapa === "revisao" && categoria && (
            <>
              <FalaDaGuia>Confere o seu pedido:</FalaDaGuia>
              <div className="mt-4 flex items-center gap-4 rounded-xl border-2 border-hu-soft bg-hu-bg/50 p-4">
                <categoria.Icone className="size-12 shrink-0 text-hu-bright" strokeWidth={2.5} aria-hidden />
                <div className="min-w-0">
                  <p className="text-lg font-bold text-hu-text">{descricao}</p>
                  <p className="text-base text-hu-muted">
                    {quantidade} {unidade}
                  </p>
                </div>
              </div>

              {erroEnvio && (
                <Aviso variante="erro" className="mt-4">
                  {erroEnvio.message}
                </Aviso>
              )}

              <Button
                onClick={enviar}
                disabled={enviando}
                className="mt-5 h-14 w-full gap-2 rounded-xl bg-hu-bright text-lg font-bold text-hu-bg hover:bg-hu-bright/90"
              >
                <Send className="size-5" aria-hidden />
                {enviando ? "Enviando…" : "Pedir"}
              </Button>
            </>
          )}

          {etapa === "fim" && (
            <>
              <FalaDaGuia humor="feliz">Pedido enviado! 🎉 O líder da horta já vai ver.</FalaDaGuia>
              <div className="mt-5 flex flex-col gap-3">
                <Button
                  onClick={() => {
                    reiniciar()
                    setEtapa("lista")
                  }}
                  className="h-12 w-full rounded-xl bg-hu-bright text-base font-bold text-hu-bg hover:bg-hu-bright/90"
                >
                  Ver meus pedidos
                </Button>
                <Button
                  onClick={() => {
                    reiniciar()
                    setEtapa("categoria")
                  }}
                  variant="outline"
                  className="h-12 w-full rounded-xl border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
                >
                  Fazer outro pedido
                </Button>
              </div>
            </>
          )}
        </div>

        {celebrando && <CelebracaoOverlay nome={sucessoNome} variante="pedido" onDismiss={() => setCelebrando(false)} />}
      </div>
    )
  }

  // ---- Lista de pedidos ----
  const plantas = solicitacoes.data ?? []
  const materiais = demandas.data ?? []
  const carregando = solicitacoes.isPending || demandas.isPending
  const vazio = !carregando && plantas.length === 0 && materiais.length === 0

  const emAberto = (status: StatusPedido) => status === "ABERTA" || status === "EM_ATENDIMENTO"

  const plantasEsperando = plantas.filter((s) => emAberto(s.status))
  const plantasRespondidas = plantas.filter((s) => !emAberto(s.status))
  const materiaisEsperando = materiais.filter((d) => emAberto(d.status))
  const materiaisRespondidos = materiais.filter((d) => !emAberto(d.status))

  const temEsperando = plantasEsperando.length > 0 || materiaisEsperando.length > 0
  const temRespondidos = plantasRespondidas.length > 0 || materiaisRespondidos.length > 0

  return (
    <div className="mx-auto max-w-2xl">
      <Voltar />
      <h1 className="mt-4 font-pixel text-sm text-hu-bright">Meus pedidos</h1>

      <Button
        onClick={() => {
          reiniciar()
          setEtapa("categoria")
        }}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-hu-bright text-lg font-bold text-hu-bg hover:bg-hu-bright/90"
      >
        <Plus className="size-6" aria-hidden />
        Fazer um pedido
      </Button>

      {carregando && <Carregando className="mt-6" />}

      {vazio && (
        <EstadoVazio ilustracao="/personagem-cachorro.webp">
          Você ainda não fez nenhum pedido. Toque em <strong>Fazer um pedido</strong> para começar.
        </EstadoVazio>
      )}

      {temEsperando && (
        <section className="mt-6">
          <p className="mb-3 font-pixel text-xs text-hu-muted">Em andamento</p>
          <ul className="flex flex-col gap-3">
            {plantasEsperando.map((s) => {
              const cancelandoEste = cancelarPlanta.isPending && cancelarPlanta.variables === s.id
              return (
                <li key={`p${s.id}`} className="rounded-2xl border-4 border-hu-bright bg-hu-panel p-4 text-hu-text">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">{nomeProduto(s.produto_id)}</p>
                      <p className="mt-0.5 text-sm text-hu-muted">Planta</p>
                    </div>
                    <ChipStatus info={STATUS[s.status]} />
                  </div>
                  <button
                    onClick={() => setConfirmarCancelar(confirmarCancelar === `p${s.id}` ? null : `p${s.id}`)}
                    disabled={cancelarPlanta.isPending}
                    aria-expanded={confirmarCancelar === `p${s.id}`}
                    className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg border border-red-400/40 px-3 text-sm text-red-600 hover:bg-red-500/15 disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden />
                    {cancelandoEste ? "Cancelando…" : "Cancelar pedido"}
                  </button>
                  {confirmarCancelar === `p${s.id}` && (
                    <ConfirmacaoInline
                      pergunta={<>Cancelar o pedido de <strong>{nomeProduto(s.produto_id)}</strong>?</>}
                      rotuloConfirmar="Sim, cancelar"
                      rotuloConfirmando="Cancelando…"
                      confirmando={cancelandoEste}
                      aoConfirmar={() => cancelarPlanta.mutate(s.id, { onSuccess: () => setConfirmarCancelar(null) })}
                      aoCancelar={() => setConfirmarCancelar(null)}
                    />
                  )}
                </li>
              )
            })}

            {materiaisEsperando.map((d) => {
              const cancelandoEste = cancelarMaterial.isPending && cancelarMaterial.variables === d.id
              return (
                <li key={`m${d.id}`} className="rounded-2xl border-4 border-hu-bright bg-hu-panel p-4 text-hu-text">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">{d.descricao}</p>
                      <p className="mt-0.5 text-sm text-hu-muted">
                        {d.quantidade} {d.unidade_medida} · {d.tipo_demanda}
                      </p>
                    </div>
                    <ChipStatus info={STATUS[d.status]} />
                  </div>
                  <button
                    onClick={() => setConfirmarCancelar(confirmarCancelar === `m${d.id}` ? null : `m${d.id}`)}
                    disabled={cancelarMaterial.isPending}
                    aria-expanded={confirmarCancelar === `m${d.id}`}
                    className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg border border-red-400/40 px-3 text-sm text-red-600 hover:bg-red-500/15 disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden />
                    {cancelandoEste ? "Cancelando…" : "Cancelar pedido"}
                  </button>
                  {confirmarCancelar === `m${d.id}` && (
                    <ConfirmacaoInline
                      pergunta={<>Cancelar o pedido de <strong>{d.descricao}</strong>?</>}
                      rotuloConfirmar="Sim, cancelar"
                      rotuloConfirmando="Cancelando…"
                      confirmando={cancelandoEste}
                      aoConfirmar={() => cancelarMaterial.mutate(d.id, { onSuccess: () => setConfirmarCancelar(null) })}
                      aoCancelar={() => setConfirmarCancelar(null)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {(cancelarPlanta.isError || cancelarMaterial.isError) && (
        <Aviso variante="erro" className="mt-4">
          {cancelarPlanta.error?.message ?? cancelarMaterial.error?.message}
        </Aviso>
      )}

      {temRespondidos && (
        <section className="mt-6">
          <p className="mb-3 font-pixel text-xs text-hu-muted">Já respondidos</p>
          <ul className="flex flex-col gap-3">
            {plantasRespondidas.map((s) => {
              const repetindoEste = criarPlanta.isPending && criarPlanta.variables?.body.produto_id === s.produto_id
              return (
                <li key={`p${s.id}`} className="rounded-2xl border-4 border-hu-soft bg-hu-panel p-4 text-hu-text">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">{nomeProduto(s.produto_id)}</p>
                      <p className="mt-0.5 text-sm text-hu-muted">Planta</p>
                    </div>
                    <ChipStatus info={STATUS[s.status]} />
                  </div>
                  <button
                    onClick={() => repetirPlanta(s)}
                    disabled={criarPlanta.isPending}
                    className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg border-2 border-hu-soft px-3 text-sm font-bold text-hu-text hover:bg-black/5 disabled:opacity-50"
                  >
                    <RotateCw className="size-4" aria-hidden />
                    {repetindoEste ? "Pedindo…" : "Pedir de novo"}
                  </button>
                </li>
              )
            })}

            {materiaisRespondidos.map((d) => {
              const repetindoEste = criarMaterial.isPending && criarMaterial.variables?.body.descricao === d.descricao
              return (
                <li key={`m${d.id}`} className="rounded-2xl border-4 border-hu-soft bg-hu-panel p-4 text-hu-text">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">{d.descricao}</p>
                      <p className="mt-0.5 text-sm text-hu-muted">
                        {d.quantidade} {d.unidade_medida} · {d.tipo_demanda}
                      </p>
                    </div>
                    <ChipStatus info={STATUS[d.status]} />
                  </div>
                  <button
                    onClick={() => repetirMaterial(d)}
                    disabled={criarMaterial.isPending}
                    className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg border-2 border-hu-soft px-3 text-sm font-bold text-hu-text hover:bg-black/5 disabled:opacity-50"
                  >
                    <RotateCw className="size-4" aria-hidden />
                    {repetindoEste ? "Pedindo…" : "Pedir de novo"}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
