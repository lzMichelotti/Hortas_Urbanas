import { type FormEvent, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { Check, MapPin, Pencil, Trash2, User } from "lucide-react"
import { useAtualizarHorta, useDeletarHorta, useHortas } from "@/features/hortas/use-hortas"
import { useUsuarios } from "@/features/usuarios/use-usuarios"
import { useDemandas } from "@/features/demandas/use-demandas"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plantinha } from "@/components/plantinha"
import { Aviso, Carregando } from "@/components/feedback"
import type { components } from "@/lib/api/schema"

type Horta = components["schemas"]["HortaPublica"]

function endereco(h: Horta): string {
  return [h.rua, h.numero, h.bairro, h.cidade, h.uf].filter(Boolean).join(", ")
}

export function HortaDetalhePage() {
  const { id } = useParams()
  const hortaId = Number(id)
  const navigate = useNavigate()

  const hortas = useHortas()
  const usuarios = useUsuarios()
  const demandas = useDemandas()
  const atualizar = useAtualizarHorta()
  const deletar = useDeletarHorta()

  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [nome, setNome] = useState("")
  const [area, setArea] = useState("")
  const [publico, setPublico] = useState("")

  if (hortas.isPending) return <Carregando />

  const horta = (hortas.data ?? []).find((h) => h.id === hortaId)
  if (!horta) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar to="/painel/hortas" />
        <p className="mt-6 rounded-2xl border-4 border-hu-soft bg-hu-panel p-6 text-center text-sm text-hu-muted">
          Essa horta não existe mais.
        </p>
      </div>
    )
  }

  const lider = (usuarios.data ?? []).find(
    (u) => u.privilegio === "LIDER_HORTA" && u.horta_id === horta.id,
  )
  const abertas = (demandas.data ?? []).filter((d) => d.horta_id === horta.id && d.status === "ABERTA").length
  const andamento = (demandas.data ?? []).filter(
    (d) => d.horta_id === horta.id && d.status === "EM_ATENDIMENTO",
  ).length
  const situacao = abertas > 0
    ? `📦 ${abertas} pedindo ajuda`
    : andamento > 0
      ? `🔄 ${andamento} em andamento`
      : "tudo em dia"
  const end = endereco(horta)

  function abrirEdicao() {
    setNome(horta!.nome)
    setArea(String(horta!.area_total))
    setPublico(horta!.publico_atendido ?? "")
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
        id: horta!.id,
        body: { nome: nome.trim(), area_total: areaNum, publico_atendido: publico.trim() || null },
      },
      { onSuccess: () => setEditando(false) },
    )
  }

  function excluir() {
    deletar.mutate(horta!.id, { onSuccess: () => navigate("/painel/hortas", { replace: true }) })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Voltar to="/painel/hortas" />

      <div className="mt-4 flex items-center gap-3">
        <Plantinha estagio="crescendo" className="size-12 shrink-0" />
        <h1 className="min-w-0 font-pixel text-sm leading-relaxed text-hu-bright">{horta.nome}</h1>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5 text-hu-text">
        {end && (
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-hu-bright" aria-hidden />
            <span>{end}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-hu-muted">
          <span>Área total: <span className="font-bold text-hu-text">{horta.area_total.toLocaleString("pt-BR")} m²</span></span>
          <span>Biodiversidade: <span className="font-bold text-hu-text">{horta.indice_biodiversidade}</span></span>
        </div>
        {horta.publico_atendido && (
          <p className="text-sm text-hu-muted">
            Público atendido: <span className="text-hu-text">{horta.publico_atendido}</span>
          </p>
        )}
        <div className="flex items-center gap-2 border-t border-hu-soft/30 pt-3 text-sm">
          <User className="size-4 shrink-0 text-hu-bright" aria-hidden />
          {lider ? (
            <span>Líder: <span className="font-bold">{lider.nome}</span></span>
          ) : (
            <span className="text-hu-muted">Sem líder</span>
          )}
        </div>
        <p className="flex items-center gap-2 text-sm">
          <span className="text-hu-muted">Situação:</span>
          <span className={abertas > 0 ? "font-bold text-amber-500" : "text-hu-text"}>{situacao}</span>
        </p>
      </div>

      {!editando && !confirmando && (
        <div className="mt-4 flex gap-2">
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
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border-4 border-red-400 bg-hu-panel p-5">
          <p className="text-red-600">
            Excluir <strong>{horta.nome}</strong> e tudo ligado a ela? Não dá pra desfazer.
          </p>
          {deletar.isError && <Aviso variante="erro">{deletar.error.message}</Aviso>}
          <div className="flex gap-2">
            <Button
              onClick={excluir}
              disabled={deletar.isPending}
              className="h-11 flex-1 rounded-xl bg-red-500 font-bold text-white hover:bg-red-500/90"
            >
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
        <form onSubmit={onSalvar} className="mt-4 flex flex-col gap-3 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5">
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
