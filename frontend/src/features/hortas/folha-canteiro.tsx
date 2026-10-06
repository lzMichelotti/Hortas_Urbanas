import { useMemo } from "react"
import { useCanteiros } from "@/features/canteiros/use-canteiros"
import { useUsuarios } from "@/features/usuarios/use-usuarios"
import { useCiclos } from "@/features/ciclos/use-ciclos"
import { useNomeProduto } from "@/features/produtos/use-nome-produto"
import { ATIVOS, STATUS, dataBR, prazoEmPalavras } from "@/features/ciclos/status"
import { motivosDoCanteiro } from "@/features/canteiros/bandeira"
import { srcAvatar } from "@/features/perfil/avatares"
import { FolhaInferior } from "@/components/ui/folha-inferior"
import { FalhaAoCarregar } from "@/components/feedback"
import { plural } from "@/lib/utils"
import type { components } from "@/lib/api/schema"

type Produtividade = components["schemas"]["ProdutividadeCanteiro"]

// A linha do responsável e a de "sem plantas" já dizem isso; repetir como motivo polui.
const SEM_RESPONSAVEL = "sem responsável"
const PARADO = "parado, nada plantado"


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

export function FolhaCanteiro({
  canteiro,
  aoFechar,
  camada,
}: {
  canteiro: Produtividade | null
  aoFechar: () => void
  camada?: string
}) {
  return (
    <FolhaInferior
      aberta={canteiro != null}
      aoMudar={(v) => !v && aoFechar()}
      titulo={canteiro ? `Canteiro ${canteiro.numero}` : ""}
      camada={camada}
    >
      {canteiro && <Conteudo canteiro={canteiro} />}
    </FolhaInferior>
  )
}

// Separado de propósito: as buscas moram aqui, então só saem para a rede quando
// o líder abre a folha — a Início fica sem pedir nada disso.
function Conteudo({ canteiro }: { canteiro: Produtividade }) {
  // Melhoria progressiva: avatar do responsável cruzando canteiro→usuário.
  const canteiros = useCanteiros()
  const usuarios = useUsuarios()
  const ciclos = useCiclos(canteiro.canteiro_id)
  const nomeProduto = useNomeProduto()

  const plantios = useMemo(() => {
    const ativos = (ciclos.data ?? []).filter((c) => ATIVOS.includes(c.status))
    return ativos.sort((a, b) => a.previsao_colheita.localeCompare(b.previsao_colheita))
  }, [ciclos.data])

  const avatarSrc = useMemo(() => {
    const cant = (canteiros.data ?? []).find((x) => x.id === canteiro.canteiro_id)
    if (cant?.usuario_id == null) return undefined
    const avatar = (usuarios.data ?? []).find((u) => u.id === cant.usuario_id)?.avatar
    return avatar ? srcAvatar(avatar) : undefined
  }, [canteiro.canteiro_id, canteiros.data, usuarios.data])

  const motivos = motivosDoCanteiro(canteiro).filter((m) => m !== PARADO && m !== SEM_RESPONSAVEL)
  const semPlantas = canteiro.plantadas + canteiro.crescendo + canteiro.prontas === 0
  const colheu = canteiro.colhido_total > 0

  return (
    <div className="text-hu-text">
      <p className="font-bold">{canteiro.identificacao}</p>

      {canteiro.responsavel ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-hu-muted">
          {avatarSrc && (
            <img
              src={avatarSrc}
              alt=""
              width={24}
              height={24}
              className="size-6 shrink-0 rounded-full object-cover"
            />
          )}
          {canteiro.responsavel}
        </p>
      ) : (
        <p className="mt-2 text-sm italic text-hu-muted">Sem responsável</p>
      )}

      {motivos.length > 0 && <p className="mt-3 text-sm font-medium">{motivos.join(" · ")}</p>}

      {semPlantas ? (
        <p className="mt-3 text-sm text-hu-muted">Sem plantas no momento.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {canteiro.plantadas > 0 && <Chip valor={canteiro.plantadas} um="plantada" varios="plantadas" />}
            {canteiro.crescendo > 0 && <Chip valor={canteiro.crescendo} um="crescendo" varios="crescendo" />}
            {canteiro.prontas > 0 && <Chip valor={canteiro.prontas} um="pronta" varios="prontas" destaque />}
          </div>

          <p className="mt-4 font-pixel text-[11px] text-hu-bright">O que está plantado</p>

          {ciclos.isPending ? (
            <p className="mt-2 text-sm text-hu-muted">Carregando as plantas…</p>
          ) : ciclos.isLoadingError ? (
            <FalhaAoCarregar className="mt-2" />
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {plantios.map((c) => {
                const status = STATUS[c.status]
                const prazo = prazoEmPalavras(c)
                return (
                  <li key={c.id} className="rounded-lg border-2 border-hu-soft px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-bold">{nomeProduto(c.produto_id)}</span>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${status.cor}`}>
                        {status.rotulo}
                      </span>
                    </div>
                    <p
                      className={`mt-0.5 text-sm ${prazo.urgente ? "font-bold text-hu-golden" : "text-hu-muted"}`}
                    >
                      {prazo.texto} · {dataBR(c.previsao_colheita)}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <p className={colheu ? undefined : "text-hu-muted"}>
          {colheu && "🧺 "}Colhido:{" "}
          <span className={colheu ? "font-bold text-hu-golden" : undefined}>
            {canteiro.colhido_total} un.
          </span>
          {canteiro.colheitas > 0 && (
            <span className="text-hu-muted"> · {plural(canteiro.colheitas, "colheita", "colheitas")}</span>
          )}
        </p>
        {canteiro.perdas > 0 && (
          <p className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-red-700 dark:text-red-200">
            {plural(canteiro.perdas, "perdida", "perdidas")}
          </p>
        )}
      </div>
    </div>
  )
}
