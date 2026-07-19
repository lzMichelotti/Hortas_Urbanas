import { useMemo, useState } from "react"
import { useMe } from "@/features/auth/use-me"
import { useProdutividade } from "@/features/canteiros/use-produtividade"
import { useCanteiros } from "@/features/canteiros/use-canteiros"
import { useUsuarios } from "@/features/usuarios/use-usuarios"
import {
  BANDEIRA_INFO,
  type Bandeira,
  bandeiraDoCanteiro,
  motivosDoCanteiro,
} from "@/features/canteiros/bandeira"
import { BandeiraPixel } from "@/features/canteiros/bandeira-pixel"
import { srcAvatar } from "@/features/perfil/avatares"
import { TERRA } from "@/features/canteiro/terra"
import { Voltar } from "@/components/voltar"
import { Aviso, Carregando, EstadoVazio } from "@/components/feedback"
import type { components } from "@/lib/api/schema"

type Produtividade = components["schemas"]["ProdutividadeCanteiro"]
type Ordem = "atencao" | "colhido"

const ESTILO: Record<Bandeira, { card: string; motivo: string }> = {
  vermelha: { card: "border-4 border-red-500 bg-red-500/10", motivo: "text-red-700 dark:text-red-300" },
  amarela: { card: "border-[3px] border-amber-400 bg-amber-400/10", motivo: "text-amber-700 dark:text-amber-300" },
  verde: { card: "border-2 border-hu-soft bg-hu-panel", motivo: "text-hu-muted" },
}

function Chip({ valor, um, varios, destaque }: { valor: number; um: string; varios: string; destaque?: boolean }) {
  return (
    <span
      className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
        destaque ? "border-amber-400 bg-amber-400/10 text-hu-golden" : "border-hu-soft bg-hu-soft/20 text-hu-text"
      }`}
    >
      {valor} {valor === 1 ? um : varios}
    </span>
  )
}

function CartaoCanteiro({ c, avatarSrc }: { c: Produtividade; avatarSrc?: string }) {
  const band = bandeiraDoCanteiro(c)
  const info = BANDEIRA_INFO[band]
  const estilo = ESTILO[band]
  // "parado" já é dito pela linha "Sem plantas no momento"; não repetir aqui.
  const motivos = motivosDoCanteiro(c).filter((m) => m !== "parado, nada plantado")
  const semPlantas = c.plantadas + c.crescendo + c.prontas === 0
  const colheu = c.colhido_total > 0

  return (
    <li className={`overflow-hidden rounded-2xl text-hu-text ${estilo.card}`}>
      {/* Faixa de terra: bandeira fincada + nome + estado */}
      <div
        className="flex items-end justify-between gap-2 px-4 pb-2 pt-5 [image-rendering:pixelated]"
        style={TERRA}
      >
        <div className="flex items-end gap-2">
          <BandeiraPixel bandeira={band} size={20} className="-mb-2 drop-shadow-[0_1px_0_rgba(0,0,0,.5)]" />
          <h2 className="font-bold leading-none text-white [text-shadow:0_1px_2px_rgba(0,0,0,.7)]">
            {c.identificacao}
          </h2>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${info.chip}`}
        >
          {info.rotulo}
        </span>
      </div>

      <div className="p-4">
        {c.responsavel && (
          <p className="flex items-center gap-2 text-sm text-hu-muted">
            {avatarSrc && (
              <img src={avatarSrc} alt="" width={24} height={24} className="size-6 shrink-0 rounded-full object-cover" />
            )}
            {c.responsavel}
          </p>
        )}

        {motivos.length > 0 && (
          <p className={`mt-2 text-sm font-medium ${estilo.motivo}`}>{motivos.join(" · ")}</p>
        )}

        {semPlantas ? (
          <p className="mt-3 text-sm text-hu-muted">Sem plantas no momento.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {c.plantadas > 0 && <Chip valor={c.plantadas} um="plantada" varios="plantadas" />}
            {c.crescendo > 0 && <Chip valor={c.crescendo} um="crescendo" varios="crescendo" />}
            {c.prontas > 0 && <Chip valor={c.prontas} um="pronta" varios="prontas" destaque />}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
          <p className={colheu ? undefined : "text-hu-muted"}>
            {colheu && "🧺 "}Colhido:{" "}
            <span className={colheu ? "font-bold text-hu-golden" : undefined}>{c.colhido_total} un.</span>
            {c.colheitas > 0 && (
              <span className="text-hu-muted"> · {c.colheitas} colheita{c.colheitas > 1 ? "s" : ""}</span>
            )}
          </p>
          {c.perdas > 0 && (
            <p className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-red-700 dark:text-red-200">
              {c.perdas} perdida{c.perdas > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </li>
  )
}

const OPCOES: { valor: Ordem; rotulo: string }[] = [
  { valor: "atencao", rotulo: "Atenção" },
  { valor: "colhido", rotulo: "Mais colhido" },
]

export function ProdutividadePage() {
  const me = useMe()
  const hortaId = me.data?.horta_id ?? null
  const produtividade = useProdutividade(hortaId)
  // Melhoria progressiva: avatar do responsável cruzando canteiro→usuário.
  // Os cartões não esperam estas duas queries (cache compartilhado do líder).
  const canteiros = useCanteiros()
  const usuarios = useUsuarios()
  const [ordem, setOrdem] = useState<Ordem>("atencao")

  const dados = useMemo(() => produtividade.data ?? [], [produtividade.data])

  const avatarPorCanteiro = useMemo(() => {
    const avatarPorUsuario = new Map((usuarios.data ?? []).map((u) => [u.id, u.avatar]))
    const mapa = new Map<number, string>()
    for (const cant of canteiros.data ?? []) {
      if (cant.usuario_id != null) {
        const avatar = avatarPorUsuario.get(cant.usuario_id)
        if (avatar) mapa.set(cant.id, srcAvatar(avatar))
      }
    }
    return mapa
  }, [canteiros.data, usuarios.data])

  const precisamAtencao = useMemo(
    () => dados.filter((c) => bandeiraDoCanteiro(c) !== "verde").length,
    [dados],
  )

  const ordenados = useMemo(() => {
    const arr = [...dados]
    if (ordem === "colhido") {
      arr.sort((a, b) => b.colhido_total - a.colhido_total)
    } else {
      arr.sort(
        (a, b) =>
          BANDEIRA_INFO[bandeiraDoCanteiro(a)].ordem - BANDEIRA_INFO[bandeiraDoCanteiro(b)].ordem,
      )
    }
    return arr
  }, [dados, ordem])

  if (me.isPending || produtividade.isPending) return <Carregando />

  if (produtividade.isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <Aviso variante="erro" className="mt-6" aoTentarNovamente={() => produtividade.refetch()}>
          Não foi possível carregar a produtividade. Veja sua internet e tente de novo.
        </Aviso>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl pb-2">
      <Voltar />
      <h1 className="mt-4 font-pixel text-sm text-hu-bright">Produtividade dos canteiros</h1>

      {dados.length === 0 ? (
        <EstadoVazio ilustracao="/personagem-idoso.webp">
          Nenhum canteiro ainda. Crie canteiros em <strong>Membros</strong> para acompanhar a produção.
        </EstadoVazio>
      ) : (
        <>
          <p className="mt-4 text-hu-text">
            {precisamAtencao === 0
              ? "Tudo em dia! 🟢"
              : `${precisamAtencao} ${precisamAtencao === 1 ? "canteiro precisa" : "canteiros precisam"} de atenção`}
          </p>

          <div className="mt-3 flex gap-2" role="group" aria-label="Ordenar canteiros">
            {OPCOES.map((o) => {
              const ativo = ordem === o.valor
              return (
                <button
                  key={o.valor}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setOrdem(o.valor)}
                  className={`min-h-11 flex-1 rounded-xl border-2 border-[#5b3a1a] px-3 font-pixel text-[11px] leading-tight transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/50 ${
                    ativo
                      ? "translate-y-0.5 bg-hu-bright text-hu-bg shadow-[0_1px_0_#5b3a1a]"
                      : "bg-hu-panel text-hu-text shadow-[0_3px_0_#5b3a1a] hover:-translate-y-0.5"
                  }`}
                >
                  {o.rotulo}
                </button>
              )
            })}
          </div>

          <details className="mt-3 rounded-xl border-2 border-hu-soft bg-hu-panel text-hu-text">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium">
              O que significa cada bandeira?
            </summary>
            <ul className="flex flex-col gap-1.5 px-4 pb-3 text-sm text-hu-muted">
              <li className="flex items-center gap-1.5">
                <BandeiraPixel bandeira="vermelha" /> <b className="text-hu-text">Atrasado</b> — a colheita passou do prazo há mais de 3 dias.
              </li>
              <li className="flex items-center gap-1.5">
                <BandeiraPixel bandeira="amarela" /> <b className="text-hu-text">Atenção</b> — tem planta pronta, ou está sem responsável, ou parado.
              </li>
              <li className="flex items-center gap-1.5">
                <BandeiraPixel bandeira="verde" /> <b className="text-hu-text">Em dia</b> — plantio em andamento, sem pendências.
              </li>
            </ul>
          </details>

          <ul className="mt-4 flex flex-col gap-3">
            {ordenados.map((c) => (
              <CartaoCanteiro key={c.canteiro_id} c={c} avatarSrc={avatarPorCanteiro.get(c.canteiro_id)} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
