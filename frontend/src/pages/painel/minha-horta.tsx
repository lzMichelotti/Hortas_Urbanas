import type { ReactNode } from "react"
import { Link } from "react-router"
import {
  ArrowRight,
  Droplets,
  Leaf,
  Lock,
  type LucideIcon,
  MapPin,
  Mountain,
  ShieldAlert,
  Users,
} from "lucide-react"
import { useMe } from "@/features/auth/use-me"
import { useHorta } from "@/features/hortas/use-hortas"
import { useProdutividade } from "@/features/canteiros/use-produtividade"
import { useUsuarios } from "@/features/usuarios/use-usuarios"
import { bandeiraDoCanteiro } from "@/features/canteiros/bandeira"
import { BandeiraPixel } from "@/features/canteiros/bandeira-pixel"
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
import { DivisorCerca } from "@/components/divisor-cerca"
import { cn } from "@/lib/utils"
import type { components } from "@/lib/api/schema"

type Horta = components["schemas"]["HortaPublica"]

const VERMELHO = "border-red-500/50 bg-red-500/15 text-red-800 dark:text-red-100"
const AMBAR = "border-amber-400/60 bg-amber-400/10 text-hu-text"

function endereco(h: Horta): string {
  return [h.rua, h.numero, h.bairro, h.cidade, h.uf].filter(Boolean).join(", ")
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

function Linha({ icone: Icone, children }: { icone: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-hu-muted">
      <Icone className="size-4 shrink-0 text-hu-bright" aria-hidden />
      <span className="text-hu-text">{children}</span>
    </p>
  )
}

function TileProducao({ valor, rotulo, destaque }: { valor: number; rotulo: string; destaque?: boolean }) {
  return (
    <Link
      to="/painel/produtividade"
      className={cn(
        "block rounded-xl border-2 p-3 text-center transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/40",
        destaque ? "border-amber-400 bg-amber-400/10" : "border-hu-soft",
      )}
    >
      <p className={cn("font-pixel text-lg", destaque ? "text-hu-golden" : "text-hu-text")}>{valor}</p>
      <p className="mt-1 text-xs text-hu-muted">{rotulo}</p>
    </Link>
  )
}

export function MinhaHortaPage() {
  const me = useMe()
  const hortaId = me.data?.horta_id ?? null
  const horta = useHorta(hortaId)
  const produtividade = useProdutividade(hortaId)
  const usuarios = useUsuarios()
  const solicitacoes = useSolicitacoesLider()
  const demandas = useDemandas()

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
  const praticas = h.praticas_cultivo ?? []

  const rows = produtividade.data ?? []
  const totalCanteiros = rows.length
  const comResponsavel = rows.filter((c) => c.responsavel != null).length
  const vazios = totalCanteiros - comResponsavel
  const membros = (usuarios.data ?? []).filter((u) => u.privilegio === "MEMBRO_CANTEIRO").length

  const prontas = rows.reduce((s, c) => s + c.prontas, 0)
  const crescendo = rows.reduce((s, c) => s + c.crescendo, 0)
  const plantadas = rows.reduce((s, c) => s + c.plantadas, 0)
  const atrasadas = rows.filter((c) => c.atrasadas > 0)
  const contagem = { vermelha: 0, amarela: 0, verde: 0 }
  for (const c of rows) contagem[bandeiraDoCanteiro(c)]++

  const pendentes = (solicitacoes.data ?? []).filter((s) => s.status === "PENDENTE").length
  const demandasAbertas = (demandas.data ?? []).filter(
    (d) => d.status === "ABERTA" || d.status === "EM_ATENDIMENTO",
  ).length

  type Pendencia = { chave: string; to: string; icone: string; cor: string; texto: string; grave?: boolean }
  const pendencias: Pendencia[] = [
    ...atrasadas.map((c) => ({
      chave: `atr-${c.canteiro_id}`,
      to: "/painel/produtividade",
      icone: "/colher.png",
      cor: VERMELHO,
      texto: `${plural(c.atrasadas, "colheita atrasada", "colheitas atrasadas")} · ${c.identificacao}`,
      grave: true,
    })),
    ...(prontas > 0
      ? [{
          chave: "prontas",
          to: "/painel/produtividade",
          icone: "/colher.png",
          cor: AMBAR,
          texto: `${plural(prontas, "planta pronta", "plantas prontas")} pra colher`,
        }]
      : []),
    ...(pendentes > 0
      ? [{
          chave: "pedidos",
          to: "/painel/solicitacoes",
          icone: "/carrinho-32.png",
          cor: AMBAR,
          texto: `${plural(pendentes, "pedido de planta aguardando", "pedidos de planta aguardando")}`,
        }]
      : []),
    ...(demandasAbertas > 0
      ? [{
          chave: "demandas",
          to: "/painel/demandas",
          icone: "/demandas.png",
          cor: AMBAR,
          texto: `${plural(demandasAbertas, "demanda em aberto", "demandas em aberto")}`,
        }]
      : []),
  ]

  const carregandoPendencias = produtividade.isPending || solicitacoes.isPending || demandas.isPending
  const n = pendencias.length
  const veredito = carregandoPendencias
    ? "Vendo como está sua horta…"
    : n === 0
      ? "Tudo em dia! 🌱"
      : `${n} ${n === 1 ? "coisa precisa" : "coisas precisam"} de você hoje!`

  return (
    <div className="mx-auto max-w-2xl pb-4">
      <Voltar />

      {/* Placa: nome da horta pintado sobre a tábua de public/placa.png */}
      <div className="mx-auto mt-2 max-w-md">
        <div
          className="flex h-16 items-center justify-center overflow-hidden rounded-lg border-2 border-[#5b3a1a] px-5 text-center [image-rendering:pixelated]"
          style={{
            // cor da própria tábua, pra preencher as bordas transparentes do sprite.
            backgroundColor: "#914925",
            backgroundImage: "url(/placa.png)",
            backgroundRepeat: "no-repeat",
            // placa.png tem 48px; a tábua ocupa as linhas 6–31. Escalo e desloco
            // pra mostrar só a tábua (sem o poste), esticada na largura toda.
            backgroundSize: "100% 118px",
            backgroundPosition: "center -14.8px",
          }}
        >
          <span className="line-clamp-2 font-pixel text-[11px] leading-snug text-[#ffe8c2] [text-shadow:1px_1px_0_#3f2810]">
            {h.nome}
          </span>
        </div>
        <DivisorCerca className="mt-1" />
      </div>

      {/* Veredito: personagem + balão de fala */}
      <div className="mt-5 flex items-start gap-3">
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

      {/* Lista de pendências, da mais grave à mais branda */}
      {carregandoPendencias ? (
        <p className="mt-4 text-sm text-hu-muted">Carregando o que precisa de você…</p>
      ) : pendencias.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          {pendencias.map((p) => (
            <Link
              key={p.chave}
              to={p.to}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-xl border-2 px-4 text-sm font-medium hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/40",
                p.cor,
              )}
            >
              <img src={p.icone} alt="" width={26} height={26} className="shrink-0 [image-rendering:pixelated]" />
              <span className="flex-1">{p.texto}</span>
              {p.grave && <BandeiraPixel bandeira="vermelha" />}
            </Link>
          ))}
        </div>
      ) : null}

      <DivisorCerca className="mt-5" />

      {/* Produção agora */}
      <section className="mt-4">
        <h2 className="font-pixel text-xs text-hu-bright">Produção agora</h2>
        {produtividade.isPending ? (
          <p className="mt-3 text-sm text-hu-muted">Carregando…</p>
        ) : produtividade.isError ? (
          <Aviso variante="erro" className="mt-3" aoTentarNovamente={() => produtividade.refetch()}>
            Não foi possível carregar a produção. Veja sua internet e tente de novo.
          </Aviso>
        ) : totalCanteiros === 0 ? (
          <p className="mt-3 text-sm text-hu-muted">Nenhum canteiro ainda.</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <TileProducao valor={prontas} rotulo="prontas pra colher" destaque={prontas > 0} />
              <TileProducao valor={crescendo} rotulo="crescendo" />
              <TileProducao valor={plantadas} rotulo="plantadas" />
            </div>
            <Link
              to="/painel/produtividade"
              aria-label={`${contagem.vermelha} atrasados, ${contagem.amarela} em atenção, ${contagem.verde} em dia. Ver produtividade por canteiro`}
              className="mt-3 flex min-h-11 items-center gap-3 rounded-xl border-2 border-hu-soft px-4 text-sm font-medium hover:bg-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/40"
            >
              <span className="flex items-center gap-3 text-hu-text" aria-hidden>
                <span className="flex items-center gap-1">
                  <BandeiraPixel bandeira="vermelha" /> {contagem.vermelha}
                </span>
                <span className="flex items-center gap-1">
                  <BandeiraPixel bandeira="amarela" /> {contagem.amarela}
                </span>
                <span className="flex items-center gap-1">
                  <BandeiraPixel bandeira="verde" /> {contagem.verde}
                </span>
              </span>
              <span className="ml-auto flex items-center gap-1 text-hu-bright">
                ver produtividade
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </span>
            </Link>
          </>
        )}
      </section>

      <DivisorCerca className="mt-5" />

      {/* Equipe (compacto) */}
      <Link
        to="/painel/membros"
        className="mt-4 flex min-h-12 items-center justify-between gap-2 rounded-xl border-2 border-hu-soft px-4 text-sm font-medium hover:bg-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/40"
      >
        <span className="flex items-center gap-2">
          <Users className="size-4 shrink-0 text-hu-bright" aria-hidden />
          Equipe · {plural(membros, "membro", "membros")} · {plural(totalCanteiros, "canteiro", "canteiros")} ·{" "}
          {plural(vazios, "vazio", "vazios")}
        </span>
        <ArrowRight className="size-4 shrink-0 text-hu-bright" aria-hidden />
      </Link>

      {/* Dados da horta (tudo do antigo perfil, agora recolhido) */}
      <details className="mt-4 rounded-2xl border-2 border-hu-soft bg-hu-panel text-hu-text">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 text-sm font-medium">
          <Leaf className="size-4 shrink-0 text-hu-bright" aria-hidden />
          Dados da horta (endereço, área…)
        </summary>
        <div className="flex flex-col gap-1.5 px-4 pb-4">
          {end && (
            <p className="flex items-start gap-1.5 text-sm text-hu-muted">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {end}
            </p>
          )}
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-hu-muted">
            <span>Área: <span className="text-hu-text">{h.area_total} m²</span></span>
            <span>Biodiversidade: <span className="text-hu-text">{h.indice_biodiversidade}</span></span>
          </p>
          {h.publico_atendido && <p className="text-sm">Atende: {h.publico_atendido}</p>}
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
          <p className="mt-2 flex items-center gap-1.5 text-xs text-hu-muted">
            <Lock className="size-3 shrink-0" aria-hidden />
            Estes dados são editados pela administração.
          </p>
        </div>
      </details>
    </div>
  )
}
