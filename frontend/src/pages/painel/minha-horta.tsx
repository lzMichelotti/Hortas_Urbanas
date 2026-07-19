import type { ReactNode } from "react"
import { Link } from "react-router"
import {
  ArrowRight,
  ClipboardCheck,
  Droplets,
  Leaf,
  Lock,
  type LucideIcon,
  MapPin,
  Megaphone,
  Mountain,
  ShieldAlert,
  Sprout,
  Users,
} from "lucide-react"
import { useMe } from "@/features/auth/use-me"
import { useHorta } from "@/features/hortas/use-hortas"
import { useCanteiros } from "@/features/canteiros/use-canteiros"
import { useUsuarios } from "@/features/usuarios/use-usuarios"
import { useCiclosDaHorta } from "@/features/ciclos/use-ciclos"
import { useSolicitacoesLider } from "@/features/solicitacoes/use-solicitacoes-lider"
import { useDemandas } from "@/features/demandas/use-demandas"
import {
  ROTULO_FONTE_AGUA,
  ROTULO_PRATICA,
  ROTULO_TIPO_SOLO,
  ROTULO_VULNERABILIDADE,
} from "@/features/hortas/rotulos"
import { Voltar } from "@/components/voltar"
import { Aviso, Carregando } from "@/components/feedback"
import type { components } from "@/lib/api/schema"

type Horta = components["schemas"]["HortaPublica"]

function endereco(h: Horta): string {
  return [h.rua, h.numero, h.bairro, h.cidade, h.uf].filter(Boolean).join(", ")
}

function Linha({ icone: Icone, children }: { icone: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-hu-muted">
      <Icone className="size-4 shrink-0 text-hu-bright" aria-hidden />
      <span className="text-hu-text">{children}</span>
    </p>
  )
}

function Numero({ valor, rotulo, destaque }: { valor: number; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border-2 p-3 text-center ${destaque ? "border-amber-400 bg-amber-400/10" : "border-hu-soft"}`}>
      <p className={`font-pixel text-lg ${destaque ? "text-hu-golden" : "text-hu-text"}`}>{valor}</p>
      <p className="mt-1 text-xs text-hu-muted">{rotulo}</p>
    </div>
  )
}

export function MinhaHortaPage() {
  const me = useMe()
  const hortaId = me.data?.horta_id ?? null
  const horta = useHorta(hortaId)
  const canteiros = useCanteiros()
  const usuarios = useUsuarios()
  const solicitacoes = useSolicitacoesLider()
  const demandas = useDemandas()

  const canteirosList = canteiros.data ?? []
  const producao = useCiclosDaHorta(canteirosList.map((c) => c.id))

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
  if (horta.isError || !horta.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <Aviso variante="erro" className="mt-6" aoTentarNovamente={() => horta.refetch()}>
          Não foi possível carregar a horta. Veja sua internet e tente de novo.
        </Aviso>
      </div>
    )
  }

  const h = horta.data
  const end = endereco(h)

  const totalCanteiros = canteirosList.length
  const comResponsavel = canteirosList.filter((c) => c.usuario_id != null).length
  const vazios = totalCanteiros - comResponsavel
  const membros = (usuarios.data ?? []).filter((u) => u.privilegio === "MEMBRO_CANTEIRO").length

  const ciclos = producao.ciclos
  const prontas = ciclos.filter((c) => c.status === "PRONTO_PARA_COLHEITA").length
  const crescendo = ciclos.filter((c) => c.status === "EM_CRESCIMENTO").length
  const plantadas = ciclos.filter((c) => c.status === "PLANTADO").length

  const pendentes = (solicitacoes.data ?? []).filter((s) => s.status === "PENDENTE").length
  const demandasAbertas = (demandas.data ?? []).filter(
    (d) => d.status === "ABERTA" || d.status === "EM_ATENDIMENTO",
  ).length

  const praticas = h.praticas_cultivo ?? []

  return (
    <div className="mx-auto max-w-2xl pb-2">
      <Voltar />
      <h1 className="mt-4 font-pixel text-sm text-hu-bright">Minha horta</h1>

      {/* Perfil */}
      <section className="mt-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5 text-hu-text">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Leaf className="size-5 shrink-0 text-hu-bright" aria-hidden />
          {h.nome}
        </h2>
        {end && (
          <p className="mt-1 flex items-start gap-1.5 text-sm text-hu-muted">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {end}
          </p>
        )}
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-hu-muted">
          <span>Área: <span className="text-hu-text">{h.area_total} m²</span></span>
          <span>Biodiversidade: <span className="text-hu-text">{h.indice_biodiversidade}</span></span>
        </p>
        {h.publico_atendido && <p className="mt-2 text-sm">Atende: {h.publico_atendido}</p>}

        {(h.tem_cisterna != null ||
          h.fonte_agua ||
          h.tipo_solo ||
          h.area_permeavel != null ||
          h.nivel_vulnerabilidade ||
          praticas.length > 0) && (
          <div className="mt-4 flex flex-col gap-1.5 border-t border-hu-soft/40 pt-4">
            {h.fonte_agua && <Linha icone={Droplets}>Água: {ROTULO_FONTE_AGUA[h.fonte_agua]}</Linha>}
            {h.tem_cisterna != null && (
              <Linha icone={Droplets}>{h.tem_cisterna ? "Tem cisterna" : "Sem cisterna"}</Linha>
            )}
            {h.tipo_solo && <Linha icone={Mountain}>Solo: {ROTULO_TIPO_SOLO[h.tipo_solo]}</Linha>}
            {h.area_permeavel != null && <Linha icone={Mountain}>Área permeável: {h.area_permeavel}%</Linha>}
            {h.nivel_vulnerabilidade && (
              <Linha icone={ShieldAlert}>
                Vulnerabilidade climática: {ROTULO_VULNERABILIDADE[h.nivel_vulnerabilidade]}
              </Linha>
            )}
            {praticas.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {praticas.map((p) => (
                  <span key={p} className="rounded-full bg-hu-soft px-2.5 py-0.5 text-xs">
                    {ROTULO_PRATICA[p]}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-4 flex items-center gap-1.5 text-xs text-hu-muted">
          <Lock className="size-3 shrink-0" aria-hidden />
          Estes dados são editados pela administração.
        </p>
      </section>

      {/* Produção */}
      <section className="mt-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5 text-hu-text">
        <h2 className="font-pixel text-xs text-hu-muted">Produção agora</h2>
        {canteiros.isPending || producao.isPending ? (
          <p className="mt-3 text-sm text-hu-muted">Carregando…</p>
        ) : totalCanteiros === 0 ? (
          <p className="mt-3 text-sm text-hu-muted">Nenhum canteiro ainda.</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Numero valor={prontas} rotulo="prontas pra colher" destaque={prontas > 0} />
              <Numero valor={crescendo} rotulo="crescendo" />
              <Numero valor={plantadas} rotulo="plantadas" />
            </div>
            {prontas > 0 && (
              <p className="mt-3 text-sm font-bold text-hu-golden">
                🧺 {prontas} planta{prontas > 1 ? "s" : ""} pronta{prontas > 1 ? "s" : ""} pra colher!
              </p>
            )}
            <Link
              to="/painel/produtividade"
              className="mt-4 flex min-h-11 items-center justify-between gap-2 rounded-xl border-2 border-hu-soft px-4 text-sm font-medium hover:bg-black/5"
            >
              Ver produtividade por canteiro
              <ArrowRight className="size-4 shrink-0 text-hu-bright" aria-hidden />
            </Link>
          </>
        )}
      </section>

      {/* Equipe e canteiros */}
      <section className="mt-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5 text-hu-text">
        <h2 className="font-pixel text-xs text-hu-muted">Equipe e canteiros</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <p className="flex items-center gap-2"><Users className="size-4 text-hu-bright" aria-hidden /> {membros} membro{membros !== 1 ? "s" : ""}</p>
          <p className="flex items-center gap-2"><Sprout className="size-4 text-hu-bright" aria-hidden /> {totalCanteiros} canteiro{totalCanteiros !== 1 ? "s" : ""}</p>
          <p className="text-hu-muted">{comResponsavel} com responsável</p>
          <p className="text-hu-muted">{vazios} vazio{vazios !== 1 ? "s" : ""}</p>
        </div>
        <Link
          to="/painel/membros"
          className="mt-4 flex min-h-11 items-center justify-between gap-2 rounded-xl border-2 border-hu-soft px-4 text-sm font-medium hover:bg-black/5"
        >
          Gerenciar membros e canteiros
          <ArrowRight className="size-4 shrink-0 text-hu-bright" aria-hidden />
        </Link>
      </section>

      {/* Pendências */}
      <section className="mt-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5 text-hu-text">
        <h2 className="font-pixel text-xs text-hu-muted">A resolver</h2>
        <div className="mt-3 flex flex-col gap-2">
          <Link
            to="/painel/solicitacoes"
            className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border-2 px-4 text-sm font-medium hover:bg-black/5 ${
              pendentes > 0 ? "border-amber-400 bg-amber-400/10" : "border-hu-soft"
            }`}
          >
            <span className="flex items-center gap-2">
              <ClipboardCheck className="size-4 shrink-0 text-hu-bright" aria-hidden />
              {solicitacoes.isPending
                ? "Solicitações…"
                : pendentes > 0
                  ? `${pendentes} pedido${pendentes > 1 ? "s" : ""} de planta aguardando`
                  : "Nenhum pedido de planta pendente"}
            </span>
            <ArrowRight className="size-4 shrink-0 text-hu-bright" aria-hidden />
          </Link>
          <Link
            to="/painel/demandas"
            className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border-2 px-4 text-sm font-medium hover:bg-black/5 ${
              demandasAbertas > 0 ? "border-amber-400 bg-amber-400/10" : "border-hu-soft"
            }`}
          >
            <span className="flex items-center gap-2">
              <Megaphone className="size-4 shrink-0 text-hu-bright" aria-hidden />
              {demandas.isPending
                ? "Demandas…"
                : demandasAbertas > 0
                  ? `${demandasAbertas} demanda${demandasAbertas > 1 ? "s" : ""} em aberto`
                  : "Nenhuma demanda em aberto"}
            </span>
            <ArrowRight className="size-4 shrink-0 text-hu-bright" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  )
}
