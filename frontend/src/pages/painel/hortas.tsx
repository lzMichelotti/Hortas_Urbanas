import { type FormEvent, useState } from "react"
import { Link } from "react-router"
import { Leaf, MapPin, Pencil, Plus, Sprout, Trash2, User } from "lucide-react"
import { useHortas, useAtualizarHorta, useDeletarHorta } from "@/features/hortas/use-hortas"
import { useUsuarios } from "@/features/usuarios/use-usuarios"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Aviso, Carregando } from "@/components/feedback"
import type { components } from "@/lib/api/schema"

type Horta = components["schemas"]["HortaPublica"]

function endereco(h: Horta): string {
  return [h.rua, h.numero, h.bairro, h.cidade, h.uf].filter(Boolean).join(", ")
}

export function HortasPage() {
  const hortas = useHortas()
  const usuarios = useUsuarios()
  const atualizar = useAtualizarHorta()
  const deletar = useDeletarHorta()

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)
  const [nome, setNome] = useState("")
  const [area, setArea] = useState("")
  const [publico, setPublico] = useState("")

  const liderDa = (hortaId: number) =>
    (usuarios.data ?? []).find((u) => u.privilegio === "LIDER_HORTA" && u.horta_id === hortaId)

  function abrirEdicao(h: Horta) {
    setEditandoId(h.id)
    setConfirmandoId(null)
    setNome(h.nome)
    setArea(String(h.area_total))
    setPublico(h.publico_atendido ?? "")
    atualizar.reset()
  }

  function onSalvar(e: FormEvent, id: number) {
    e.preventDefault()
    const areaNum = Number(area)
    if (!nome.trim() || !(areaNum > 0)) return
    atualizar.mutate(
      {
        id,
        body: {
          nome: nome.trim(),
          area_total: areaNum,
          publico_atendido: publico.trim() || null,
        },
      },
      { onSuccess: () => setEditandoId(null) },
    )
  }

  if (hortas.isPending) return <Carregando />

  if (hortas.isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <Aviso variante="erro" className="mt-6" aoTentarNovamente={() => hortas.refetch()}>
          Não foi possível carregar as hortas. Veja sua internet e tente de novo.
        </Aviso>
      </div>
    )
  }

  const lista = hortas.data ?? []

  return (
    <div className="mx-auto max-w-2xl">
      <Voltar />

      <div className="mt-4 flex items-center justify-between gap-3">
        <h1 className="font-pixel text-sm text-hu-bright">
          Hortas {lista.length > 0 && <span className="text-hu-muted">({lista.length})</span>}
        </h1>
        <Button asChild className="gap-2 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90">
          <Link to="/painel/cadastrar">
            <Plus className="size-4" aria-hidden />
            Cadastrar horta
          </Link>
        </Button>
      </div>

      {lista.length === 0 && (
        <p className="mt-4 rounded-2xl border-4 border-hu-soft bg-hu-panel p-6 text-center text-sm text-hu-muted">
          Nenhuma horta cadastrada. Clique em "Cadastrar horta" para começar.
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {lista.map((h) => {
          const lider = liderDa(h.id)
          const editandoEste = editandoId === h.id
          const confirmandoEste = confirmandoId === h.id
          const excluindoEste = deletar.isPending && deletar.variables === h.id
          const end = endereco(h)

          return (
            <li key={h.id} className="rounded-2xl border-4 border-hu-bright bg-hu-panel p-4 text-hu-text">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-bold">
                    <Leaf className="size-4 shrink-0 text-hu-bright" aria-hidden />
                    {h.nome}
                  </p>
                  {end && (
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-hu-muted">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      {end}
                    </p>
                  )}
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-hu-muted">
                    <span>Área: <span className="text-hu-text">{h.area_total} m²</span></span>
                    <span>Biodiv.: <span className="text-hu-text">{h.indice_biodiversidade}</span></span>
                  </p>
                  {h.publico_atendido && (
                    <p className="mt-1 text-sm text-hu-muted">{h.publico_atendido}</p>
                  )}
                  <p className="mt-1 flex items-center gap-1.5 text-xs">
                    <User className="size-3.5 shrink-0 text-hu-bright" aria-hidden />
                    {lider ? (
                      <span className="text-hu-text">Líder: {lider.nome}</span>
                    ) : (
                      <span className="text-hu-muted">Sem líder</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => (editandoEste ? setEditandoId(null) : abrirEdicao(h))}
                    className="flex size-11 items-center justify-center rounded-lg border border-hu-soft/40 text-hu-muted hover:bg-black/5"
                    aria-label={`Editar ${h.nome}`}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    onClick={() => {
                      setConfirmandoId(confirmandoEste ? null : h.id)
                      setEditandoId(null)
                    }}
                    disabled={deletar.isPending}
                    className="flex size-11 items-center justify-center rounded-lg border border-red-400/40 text-red-600 hover:bg-red-500/15 disabled:opacity-50"
                    aria-label={`Excluir ${h.nome}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>

              {confirmandoEste && (
                <div className="mt-3 flex flex-col gap-2 border-t border-red-400/30 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-red-600">
                    Excluir <strong>{h.nome}</strong> e tudo ligado a ela? Não dá pra desfazer.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => deletar.mutate(h.id, { onSuccess: () => setConfirmandoId(null) })}
                      disabled={excluindoEste}
                      className="rounded-lg bg-red-500 font-bold text-hu-text hover:bg-red-500/90"
                    >
                      {excluindoEste ? "Excluindo…" : "Sim, excluir"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmandoId(null)}
                      className="rounded-lg border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {editandoEste && (
                <form onSubmit={(e) => onSalvar(e, h.id)} className="mt-3 flex flex-col gap-3 border-t border-hu-soft/30 pt-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`nome-${h.id}`} className="text-sm text-hu-text">Nome da horta</Label>
                    <Input
                      id={`nome-${h.id}`}
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`area-${h.id}`} className="text-sm text-hu-text">Área total (m²)</Label>
                    <Input
                      id={`area-${h.id}`}
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`pub-${h.id}`} className="text-sm text-hu-text">
                      Público atendido <span className="text-hu-muted">(opcional)</span>
                    </Label>
                    <Input
                      id={`pub-${h.id}`}
                      placeholder="Ex: famílias do bairro, escola..."
                      value={publico}
                      onChange={(e) => setPublico(e.target.value)}
                      className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
                    />
                  </div>

                  {atualizar.isError && (
                    <Aviso variante="erro">{atualizar.error.message}</Aviso>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={!nome.trim() || !(Number(area) > 0) || atualizar.isPending}
                      className="h-11 flex-1 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
                    >
                      <Sprout className="size-4" aria-hidden />
                      {atualizar.isPending ? "Salvando…" : "Salvar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditandoId(null)}
                      className="h-11 rounded-xl border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}
            </li>
          )
        })}
      </ul>

      {deletar.isError && (
        <Aviso variante="erro" className="mt-4">{deletar.error.message}</Aviso>
      )}
    </div>
  )
}
