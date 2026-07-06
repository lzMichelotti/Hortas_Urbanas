import { type FormEvent, useMemo, useState } from "react"
import { Check, Mail, Pencil, Phone, Sprout, Trash2 } from "lucide-react"
import { useMe } from "@/features/auth/use-me"
import { useUsuarios, useAtualizarUsuario, useRemoverMembro } from "@/features/usuarios/use-usuarios"
import { useHortas } from "@/features/hortas/use-hortas"
import { formatTelefone, digitos, validarTelefone } from "@/lib/br"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Aviso, Carregando } from "@/components/feedback"
import type { components } from "@/lib/api/schema"

type Usuario = components["schemas"]["UsuarioRead"]
type Privilegio = components["schemas"]["Privilegio"]

const ROTULO_PRIVILEGIO: Record<Privilegio, string> = {
  ADMIN_SUPREMO: "Administração",
  LIDER_HORTA: "Líder",
  MEMBRO_CANTEIRO: "Membro",
}

const COR_PRIVILEGIO: Record<Privilegio, string> = {
  ADMIN_SUPREMO: "bg-hu-terracotta text-white",
  LIDER_HORTA: "bg-hu-bright text-hu-bg",
  MEMBRO_CANTEIRO: "bg-hu-soft text-hu-text",
}

type Filtro = "TODOS" | Privilegio
const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: "TODOS", label: "Todos" },
  { valor: "ADMIN_SUPREMO", label: "Admins" },
  { valor: "LIDER_HORTA", label: "Líderes" },
  { valor: "MEMBRO_CANTEIRO", label: "Membros" },
]

export function UsuariosPage() {
  const me = useMe()
  const usuarios = useUsuarios()
  const hortas = useHortas()
  const atualizar = useAtualizarUsuario()
  const remover = useRemoverMembro()

  const [busca, setBusca] = useState("")
  const [filtro, setFiltro] = useState<Filtro>("TODOS")

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [privilegio, setPrivilegio] = useState<Privilegio>("MEMBRO_CANTEIRO")
  const [hortaId, setHortaId] = useState<number | "">("")

  const nomeHorta = (id: number | null | undefined) =>
    id == null ? null : hortas.data?.find((h) => h.id === id)?.nome ?? `Horta #${id}`

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return (usuarios.data ?? [])
      .filter((u) => filtro === "TODOS" || u.privilegio === filtro)
      .filter(
        (u) =>
          termo === "" ||
          u.nome.toLowerCase().includes(termo) ||
          u.email.toLowerCase().includes(termo),
      )
  }, [usuarios.data, busca, filtro])

  const telValido = validarTelefone(telefone)

  function abrirEdicao(u: Usuario) {
    setEditandoId(u.id)
    setConfirmandoId(null)
    setNome(u.nome)
    setEmail(u.email)
    setTelefone(formatTelefone(u.telefone))
    setPrivilegio(u.privilegio)
    setHortaId(u.horta_id ?? "")
    atualizar.reset()
  }

  function onSalvar(e: FormEvent, id: number) {
    e.preventDefault()
    if (!nome.trim() || !email.trim() || !telValido) return
    atualizar.mutate(
      {
        id,
        body: {
          nome: nome.trim(),
          email: email.trim(),
          telefone: digitos(telefone),
          privilegio,
          horta_id: privilegio === "ADMIN_SUPREMO" ? null : hortaId === "" ? null : hortaId,
        },
      },
      { onSuccess: () => setEditandoId(null) },
    )
  }

  if (usuarios.isPending) return <Carregando />

  if (usuarios.isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <Aviso variante="erro" className="mt-6" aoTentarNovamente={() => usuarios.refetch()}>
          Não foi possível carregar os usuários. Veja sua internet e tente de novo.
        </Aviso>
      </div>
    )
  }

  const total = usuarios.data?.length ?? 0

  return (
    <div className="mx-auto max-w-2xl">
      <Voltar />

      <h1 className="mt-4 font-pixel text-sm text-hu-bright">
        Usuários {total > 0 && <span className="text-hu-muted">({total})</span>}
      </h1>

      <Input
        placeholder="Buscar por nome ou e-mail…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="mt-4 h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const ativo = filtro === f.valor
          return (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              aria-pressed={ativo}
              className={`min-h-9 rounded-full border-2 px-4 text-sm font-medium transition-colors ${
                ativo
                  ? "border-hu-bright bg-hu-bright text-hu-bg"
                  : "border-hu-soft text-hu-muted hover:bg-black/5"
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {lista.length === 0 && (
        <p className="mt-4 rounded-2xl border-4 border-hu-soft bg-hu-panel p-6 text-center text-sm text-hu-muted">
          Nenhum usuário encontrado.
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {lista.map((u) => {
          const editandoEste = editandoId === u.id
          const confirmandoEste = confirmandoId === u.id
          const removendoEste = remover.isPending && remover.variables === u.id
          const souEu = me.data?.id === u.id
          const horta = nomeHorta(u.horta_id)

          return (
            <li key={u.id} className="rounded-2xl border-4 border-hu-bright bg-hu-panel p-4 text-hu-text">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{u.nome}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${COR_PRIVILEGIO[u.privilegio]}`}>
                      {ROTULO_PRIVILEGIO[u.privilegio]}
                    </span>
                    {souEu && <span className="text-[11px] text-hu-muted">(você)</span>}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-hu-muted">
                    <Mail className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{u.email}</span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-hu-muted">
                    <Phone className="size-3.5 shrink-0" aria-hidden />
                    {formatTelefone(u.telefone)}
                  </p>
                  {horta && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-hu-text">
                      <Sprout className="size-3.5 shrink-0 text-hu-bright" aria-hidden />
                      {horta}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-hu-muted">CPF {u.cpf_mascarado}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => (editandoEste ? setEditandoId(null) : abrirEdicao(u))}
                    className="flex size-11 items-center justify-center rounded-lg border border-hu-soft/40 text-hu-muted hover:bg-black/5"
                    aria-label={`Editar ${u.nome}`}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    onClick={() => {
                      setConfirmandoId(confirmandoEste ? null : u.id)
                      setEditandoId(null)
                    }}
                    disabled={remover.isPending || souEu}
                    title={souEu ? "Você não pode excluir a própria conta" : undefined}
                    className="flex size-11 items-center justify-center rounded-lg border border-red-400/40 text-red-600 hover:bg-red-500/15 disabled:opacity-40"
                    aria-label={`Excluir ${u.nome}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>

              {confirmandoEste && (
                <div className="mt-3 flex flex-col gap-2 border-t border-red-400/30 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-red-600">
                    Excluir a conta de <strong>{u.nome}</strong>? Não dá pra desfazer.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => remover.mutate(u.id, { onSuccess: () => setConfirmandoId(null) })}
                      disabled={removendoEste}
                      className="rounded-lg bg-red-500 font-bold text-white hover:bg-red-500/90"
                    >
                      {removendoEste ? "Excluindo…" : "Sim, excluir"}
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
                <form onSubmit={(e) => onSalvar(e, u.id)} className="mt-3 flex flex-col gap-3 border-t border-hu-soft/30 pt-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`nome-${u.id}`} className="text-sm text-hu-text">Nome</Label>
                    <Input
                      id={`nome-${u.id}`}
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`email-${u.id}`} className="text-sm text-hu-text">E-mail</Label>
                    <Input
                      id={`email-${u.id}`}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`tel-${u.id}`} className="text-sm text-hu-text">Telefone</Label>
                    <Input
                      id={`tel-${u.id}`}
                      inputMode="numeric"
                      value={telefone}
                      onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                      className={`h-11 rounded-lg border-2 bg-hu-bg text-hu-text placeholder:text-hu-muted ${
                        telefone !== "" && !telValido ? "border-red-400" : "border-hu-soft"
                      }`}
                    />
                    {telefone !== "" && !telValido && (
                      <p className="text-xs text-red-600">Telefone deve ter 10 ou 11 dígitos.</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`papel-${u.id}`} className="text-sm text-hu-text">Papel</Label>
                    <select
                      id={`papel-${u.id}`}
                      value={privilegio}
                      onChange={(e) => setPrivilegio(e.target.value as Privilegio)}
                      className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg px-3 text-hu-text"
                    >
                      <option value="MEMBRO_CANTEIRO">Membro de canteiro</option>
                      <option value="LIDER_HORTA">Líder de horta</option>
                      <option value="ADMIN_SUPREMO">Administração</option>
                    </select>
                  </div>
                  {privilegio !== "ADMIN_SUPREMO" && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`horta-${u.id}`} className="text-sm text-hu-text">Horta</Label>
                      <select
                        id={`horta-${u.id}`}
                        value={hortaId}
                        onChange={(e) => setHortaId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg px-3 text-hu-text"
                      >
                        <option value="">Sem horta</option>
                        {(hortas.data ?? []).map((h) => (
                          <option key={h.id} value={h.id}>{h.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {atualizar.isError && <Aviso variante="erro">{atualizar.error.message}</Aviso>}

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={!nome.trim() || !email.trim() || !telValido || atualizar.isPending}
                      className="h-11 flex-1 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
                    >
                      <Check className="size-4" aria-hidden />
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

      {remover.isError && <Aviso variante="erro" className="mt-4">{remover.error.message}</Aviso>}
    </div>
  )
}
