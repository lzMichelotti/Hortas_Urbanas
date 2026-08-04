import { type FormEvent, useState } from "react"
import { useNavigate, useParams } from "react-router"
import {
  Check, Droplets, Leaf, Mail, MapPin, Mountain, Pencil, Phone, ShieldAlert,
  Sprout, Trash, Trash2, Users,
} from "lucide-react"
import { useAtualizarHorta, useDeletarHorta } from "@/features/hortas/use-hortas"
import { useFichaHorta } from "@/features/admin/use-painel-admin"
import { Cartao, Numero } from "@/features/admin/blocos"
import {
  ROTULO_FONTE_AGUA,
  ROTULO_PRATICA,
  ROTULO_TIPO_SOLO,
  ROTULO_VULNERABILIDADE,
} from "@/features/hortas/rotulos"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plantinha } from "@/components/plantinha"
import { Aviso, Carregando } from "@/components/feedback"
import { endereco, plural } from "@/lib/utils"
import { dataCurta } from "@/lib/tempo"

const m2 = (v: number) => `${v.toLocaleString("pt-BR")} m²`

export function HortaDetalhePage() {
  const { id } = useParams()
  const hortaId = Number(id)
  const navigate = useNavigate()

  const ficha = useFichaHorta(hortaId)
  const atualizar = useAtualizarHorta()
  const deletar = useDeletarHorta()

  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [nome, setNome] = useState("")
  const [area, setArea] = useState("")
  const [publico, setPublico] = useState("")

  if (ficha.isPending) return <Carregando />

  if (ficha.isError || !ficha.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar to="/painel/hortas" />
        <Aviso variante="erro" className="mt-6" aoTentarNovamente={() => ficha.refetch()}>
          Não foi possível carregar esta horta. Veja sua internet e tente de novo.
        </Aviso>
      </div>
    )
  }

  const f = ficha.data
  const horta = f.horta
  const end = endereco(horta)
  const praticas = horta.praticas_cultivo ?? []
  const temResiliencia =
    horta.fonte_agua != null ||
    horta.tem_cisterna != null ||
    horta.tipo_solo != null ||
    horta.area_permeavel != null ||
    horta.nivel_vulnerabilidade != null ||
    praticas.length > 0

  function abrirEdicao() {
    setNome(horta.nome)
    setArea(String(horta.area_total))
    setPublico(horta.publico_atendido ?? "")
    setConfirmando(false)
    atualizar.reset()
    setEditando(true)
  }

  function onSalvar(e: FormEvent) {
    e.preventDefault()
    const areaNum = Number(area)
    if (!nome.trim() || !(areaNum > 0)) return
    atualizar.mutate(
      {
        id: horta.id,
        body: { nome: nome.trim(), area_total: areaNum, publico_atendido: publico.trim() || null },
      },
      { onSuccess: () => setEditando(false) },
    )
  }

  function excluir() {
    deletar.mutate(horta.id, { onSuccess: () => navigate("/painel/hortas", { replace: true }) })
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-4">
      <Voltar to="/painel/hortas" />

      <div className="flex items-center gap-3">
        <Plantinha estagio="crescendo" className="size-12 shrink-0" />
        <h1 className="min-w-0 font-pixel text-sm leading-relaxed text-hu-bright">{horta.nome}</h1>
      </div>

      <Cartao titulo="A horta" icone={Leaf}>
        <div className="flex flex-col gap-2">
          {end && (
            <p className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-hu-bright" aria-hidden />
              <span>{end}</span>
            </p>
          )}
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-hu-muted">
            <span>Área: <span className="font-bold text-hu-text">{m2(horta.area_total)}</span></span>
            <span>
              Biodiversidade:{" "}
              <span className="font-bold text-hu-text">{horta.indice_biodiversidade}</span>
            </span>
          </p>
          {horta.publico_atendido && (
            <p className="text-sm text-hu-muted">
              Atende: <span className="text-hu-text">{horta.publico_atendido}</span>
            </p>
          )}
        </div>
      </Cartao>

      {temResiliencia && (
        <Cartao titulo="Água, solo e clima" icone={Droplets}>
          <div className="flex flex-col gap-1.5 text-sm text-hu-muted">
            {horta.fonte_agua && (
              <p className="flex items-center gap-2">
                <Droplets className="size-4 shrink-0 text-hu-bright" aria-hidden />
                <span className="text-hu-text">Água: {ROTULO_FONTE_AGUA[horta.fonte_agua]}</span>
              </p>
            )}
            {horta.tem_cisterna != null && (
              <p className="flex items-center gap-2">
                <Droplets className="size-4 shrink-0 text-hu-bright" aria-hidden />
                <span className="text-hu-text">
                  {horta.tem_cisterna ? "Tem cisterna" : "Sem cisterna"}
                </span>
              </p>
            )}
            {horta.tipo_solo && (
              <p className="flex items-center gap-2">
                <Mountain className="size-4 shrink-0 text-hu-bright" aria-hidden />
                <span className="text-hu-text">Solo: {ROTULO_TIPO_SOLO[horta.tipo_solo]}</span>
              </p>
            )}
            {horta.area_permeavel != null && (
              <p className="flex items-center gap-2">
                <Mountain className="size-4 shrink-0 text-hu-bright" aria-hidden />
                <span className="text-hu-text">Área permeável: {horta.area_permeavel}%</span>
              </p>
            )}
            {horta.nivel_vulnerabilidade && (
              <p className="flex items-center gap-2">
                <ShieldAlert className="size-4 shrink-0 text-hu-bright" aria-hidden />
                <span className="text-hu-text">
                  Vulnerabilidade climática: {ROTULO_VULNERABILIDADE[horta.nivel_vulnerabilidade]}
                </span>
              </p>
            )}
            {praticas.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {praticas.map((p) => (
                  <span key={p} className="rounded-full bg-hu-soft px-2.5 py-0.5 text-xs text-hu-text">
                    {ROTULO_PRATICA[p]}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Cartao>
      )}

      <Cartao titulo="Equipe" icone={Users}>
        {f.lider ? (
          <div className="flex flex-col gap-1.5 text-sm">
            <p className="font-bold text-hu-text">Líder: {f.lider.nome}</p>
            <p className="flex items-center gap-2 text-hu-muted">
              <Mail className="size-4 shrink-0 text-hu-bright" aria-hidden />
              <a href={`mailto:${f.lider.email}`} className="underline underline-offset-2">
                {f.lider.email}
              </a>
            </p>
            <p className="flex items-center gap-2 text-hu-muted">
              <Phone className="size-4 shrink-0 text-hu-bright" aria-hidden />
              <a href={`tel:${f.lider.telefone}`} className="underline underline-offset-2">
                {f.lider.telefone}
              </a>
            </p>
          </div>
        ) : (
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
            Esta horta está sem líder.
          </p>
        )}
        <p className="mt-3 border-t border-hu-soft/40 pt-3 text-sm text-hu-muted">
          {plural(f.membros, "membro cadastrado", "membros cadastrados")}
        </p>
      </Cartao>

      <Cartao titulo="Canteiros" icone={Sprout}>
        <div className="grid grid-cols-3 gap-3">
          <Numero valor={f.canteiros.ativos} rotulo="no total" />
          <Numero valor={f.canteiros.com_responsavel} rotulo="com responsável" />
          <Numero
            valor={f.canteiros.ociosos}
            rotulo="sem ninguém cuidando"
            atencao={f.canteiros.ociosos > 0}
          />
        </div>
        {f.canteiros.area_produtiva_m2 > 0 && (
          <p className="mt-3 border-t border-hu-soft/40 pt-3 text-sm text-hu-muted">
            Área cultivada:{" "}
            <span className="font-bold text-hu-text">{m2(f.canteiros.area_produtiva_m2)}</span>
            {f.canteiros.area_ociosa_m2 > 0 && (
              <> · parada: <span className="font-bold text-hu-text">{m2(f.canteiros.area_ociosa_m2)}</span></>
            )}
          </p>
        )}
      </Cartao>

      <Cartao titulo={`Produção dos últimos ${f.dias} dias`} icone={Sprout}>
        <div className="grid grid-cols-3 gap-3">
          <Numero valor={f.producao.plantios} rotulo="plantios" />
          <Numero valor={f.producao.colheitas} rotulo="colheitas" />
          <Numero valor={f.producao.perdas} rotulo="perdas" atencao={f.producao.perdas > 0} />
        </div>
        <p className="mt-3 border-t border-hu-soft/40 pt-3 text-sm text-hu-muted">
          {f.ultima_atividade ? (
            <>
              Última movimentação em{" "}
              <span className="font-bold text-hu-text">{dataCurta(f.ultima_atividade)}</span>.
            </>
          ) : (
            "Nenhum plantio registrado nesta horta ainda."
          )}
        </p>
      </Cartao>

      {!editando && !confirmando && (
        <div className="flex gap-2">
          <Button
            onClick={abrirEdicao}
            className="h-11 flex-1 gap-2 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
          >
            <Pencil className="size-4" aria-hidden />
            Editar
          </Button>
          <Button
            onClick={() => setConfirmando(true)}
            variant="outline"
            className="h-11 flex-1 gap-2 rounded-xl border-red-400 bg-transparent font-bold text-red-600 hover:bg-red-500/10"
          >
            <Trash2 className="size-4" aria-hidden />
            Excluir
          </Button>
        </div>
      )}

      {confirmando && (
        <div className="flex flex-col gap-3 rounded-2xl border-4 border-red-400 bg-hu-panel p-5">
          <p className="text-red-600">
            Excluir <strong>{horta.nome}</strong> e tudo ligado a ela? Não dá pra desfazer.
          </p>
          {deletar.isError && <Aviso variante="erro">{deletar.error.message}</Aviso>}
          <div className="flex gap-2">
            <Button
              onClick={excluir}
              disabled={deletar.isPending}
              className="h-11 flex-1 gap-2 rounded-xl bg-red-500 font-bold text-white hover:bg-red-500/90"
            >
              <Trash className="size-4" aria-hidden />
              {deletar.isPending ? "Excluindo…" : "Sim, excluir"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmando(false)}
              className="h-11 flex-1 rounded-xl border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {editando && (
        <form
          onSubmit={onSalvar}
          className="flex flex-col gap-3 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome" className="text-sm text-hu-text">Nome da horta</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="area" className="text-sm text-hu-text">Área total (m²)</Label>
            <Input
              id="area"
              type="number"
              min="0.1"
              step="0.1"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="publico" className="text-sm text-hu-text">
              Público atendido <span className="text-hu-muted">(opcional)</span>
            </Label>
            <Input
              id="publico"
              placeholder="Ex: famílias do bairro, escola..."
              value={publico}
              onChange={(e) => setPublico(e.target.value)}
              className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
            />
          </div>

          {atualizar.isError && <Aviso variante="erro">{atualizar.error.message}</Aviso>}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!nome.trim() || !(Number(area) > 0) || atualizar.isPending}
              className="h-11 flex-1 gap-2 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
            >
              <Check className="size-4" aria-hidden />
              {atualizar.isPending ? "Salvando…" : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditando(false)}
              className="h-11 rounded-xl border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
