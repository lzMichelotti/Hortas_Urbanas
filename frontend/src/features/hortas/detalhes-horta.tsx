import type { ReactNode } from "react"
import { Link } from "react-router"
import { ArrowRight, Droplets, Leaf, Lock, type LucideIcon, MapPin, Mountain, ShieldAlert, Users } from "lucide-react"
import { useMe } from "@/features/auth/use-me"
import { useHorta } from "@/features/hortas/use-hortas"
import { useProdutividade } from "@/features/canteiros/use-produtividade"
import { useUsuarios } from "@/features/usuarios/use-usuarios"
import { BandeiraPixel } from "@/features/canteiros/bandeira-pixel"
import {
  ROTULO_FONTE_AGUA,
  ROTULO_PRATICA,
  ROTULO_TIPO_SOLO,
  ROTULO_VULNERABILIDADE,
} from "@/features/hortas/rotulos"
import { endereco, plural } from "@/lib/utils"

function Linha({ icone: Icone, children }: { icone: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-hu-muted">
      <Icone className="size-4 shrink-0 text-hu-bright" aria-hidden />
      <span className="text-hu-text">{children}</span>
    </p>
  )
}

/**
 * Legenda das bandeiras, atalho da equipe e ficha da horta.
 * Busca os próprios dados de propósito: montado dentro do Dialog em tela cheia,
 * só pede à rede quando o líder realmente abre a horta.
 */
export function DetalhesDaHorta({ aoNavegar }: { aoNavegar?: () => void }) {
  const me = useMe()
  const hortaId = me.data?.horta_id ?? null
  const horta = useHorta(hortaId)
  const produtividade = useProdutividade(hortaId)
  const usuarios = useUsuarios()

  const h = horta.data
  const membros = (usuarios.data ?? []).filter((u) => u.privilegio === "MEMBRO_CANTEIRO").length
  const totalCanteiros = (produtividade.data ?? []).length
  const praticas = h?.praticas_cultivo ?? []
  const end = h ? endereco(h) : ""

  return (
    <>
      <details className="mt-4 rounded-xl border-2 border-hu-soft bg-hu-panel text-hu-text">
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

      <Link
        to="/painel/membros"
        onClick={aoNavegar}
        className="mt-4 flex min-h-12 items-center justify-between gap-2 rounded-xl border-2 border-hu-soft px-4 text-sm font-medium hover:bg-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hu-bright/40"
      >
        <span className="flex items-center gap-2">
          <Users className="size-4 shrink-0 text-hu-bright" aria-hidden />
          Equipe · {plural(membros, "membro", "membros")} · {plural(totalCanteiros, "canteiro", "canteiros")}
        </span>
        <ArrowRight className="size-4 shrink-0 text-hu-bright" aria-hidden />
      </Link>

      {h && (
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
      )}
    </>
  )
}
