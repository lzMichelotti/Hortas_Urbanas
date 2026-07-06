import { type FormEvent, useState } from "react"
import { Plus, Trash2, UserCheck, UserX } from "lucide-react"
import { useMe } from "@/features/auth/use-me"
import { useCanteiros, useCriarCanteiro, useAtualizarCanteiro, useDeletarCanteiro } from "@/features/canteiros/use-canteiros"
import { useUsuarios, useCriarMembro, useRemoverMembro } from "@/features/usuarios/use-usuarios"
import { formatCPF, formatTelefone, digitos, validarCPF, validarTelefone } from "@/lib/br"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { components } from "@/lib/api/schema"
import { Aviso, Carregando } from "@/components/feedback"
import { ConfirmacaoInline } from "@/components/confirmar"

type UsuarioReadCompleto = components["schemas"]["UsuarioReadCompleto"]

export function MembrosPage() {
  const me = useMe()
  const canteiros = useCanteiros()
  const usuarios = useUsuarios()
  const criarCanteiro = useCriarCanteiro(me.data?.horta_id ?? 0)
  const atualizarCanteiro = useAtualizarCanteiro()
  const deletarCanteiro = useDeletarCanteiro()
  const criarMembro = useCriarMembro()
  const removerMembro = useRemoverMembro()

  const [mostraFormMembro, setMostraFormMembro] = useState(false)
  const [membroCriado, setMembroCriado] = useState<UsuarioReadCompleto | null>(null)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")
  const [telefone, setTelefone] = useState("")
  const [tentouEnviar, setTentouEnviar] = useState(false)

  const cpfValido = validarCPF(cpf)
  const telValido = validarTelefone(telefone)
  const cpfCompleto = digitos(cpf).length === 11
  const telCompleto = digitos(telefone).length >= 10

  const [mostraFormCanteiro, setMostraFormCanteiro] = useState(false)
  const [identificacao, setIdentificacao] = useState("")
  const [area, setArea] = useState("")
  const [membroIdCanteiro, setMembroIdCanteiro] = useState<number | "">("")

  const [atribuindoId, setAtribuindoId] = useState<number | null>(null)
  const [novoMembroId, setNovoMembroId] = useState<number | "">("")

  const [confirmarMembroId, setConfirmarMembroId] = useState<number | null>(null)
  const [confirmarCanteiroId, setConfirmarCanteiroId] = useState<number | null>(null)

  const hortaId = me.data?.horta_id ?? null
  const membros = (usuarios.data ?? []).filter(
    (u) => u.privilegio === "MEMBRO_CANTEIRO" && u.horta_id === hortaId,
  )

  const canteiroDoMembro = (userId: number) =>
    (canteiros.data ?? []).find((c) => c.usuario_id === userId)

  const nomeUsuario = (id: number | null | undefined) => {
    if (id == null) return null
    return usuarios.data?.find((u) => u.id === id)?.nome ?? `Usuário #${id}`
  }

  function resetFormMembro() {
    setNome("")
    setEmail("")
    setCpf("")
    setTelefone("")
    setTentouEnviar(false)
    setMostraFormMembro(false)
    criarMembro.reset()
  }

  function onSubmitMembro(e: FormEvent) {
    e.preventDefault()
    setTentouEnviar(true)
    if (!cpfValido || !telValido) return
    criarMembro.mutate(
      {
        nome: nome.trim(),
        email: email.trim(),
        cpf: digitos(cpf),
        telefone: digitos(telefone),
        privilegio: "MEMBRO_CANTEIRO",
      },
      {
        onSuccess: (novo) => {
          setMembroCriado(novo)
          resetFormMembro()
        },
      },
    )
  }

  function resetFormCanteiro() {
    setIdentificacao("")
    setArea("")
    setMembroIdCanteiro("")
    setMostraFormCanteiro(false)
  }

  function onSubmitCanteiro(e: FormEvent) {
    e.preventDefault()
    if (!identificacao.trim()) return
    criarCanteiro.mutate(
      {
        identificacao: identificacao.trim(),
        area_produtiva: area ? Number(area) : undefined,
        usuario_id: membroIdCanteiro !== "" ? membroIdCanteiro : undefined,
      },
      { onSuccess: resetFormCanteiro },
    )
  }

  function onSubmitAtribuir(e: FormEvent, canteiroId: number) {
    e.preventDefault()
    atualizarCanteiro.mutate(
      { id: canteiroId, body: { usuario_id: novoMembroId !== "" ? novoMembroId : null } },
      {
        onSuccess: () => {
          setAtribuindoId(null)
          setNovoMembroId("")
        },
      },
    )
  }

  if (me.isPending || canteiros.isPending || usuarios.isPending) {
    return <Carregando />
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Voltar />

      {/* ── MEMBROS ── */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <h1 className="font-pixel text-sm text-hu-bright">Membros</h1>
        {!mostraFormMembro && !membroCriado && (
          <Button
            onClick={() => setMostraFormMembro(true)}
            className="flex items-center gap-2 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
          >
            <Plus className="size-4" aria-hidden />
            Novo membro
          </Button>
        )}
      </div>

      {membroCriado && (
        <div className="mt-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5 text-hu-text">
          <p className="font-bold text-hu-text">✓ Membro cadastrado!</p>
          <p className="mt-2 text-sm">{membroCriado.nome}</p>
          <p className="mt-1 text-sm text-hu-muted">
            E-mail: <span className="text-hu-text">{membroCriado.email}</span>
          </p>
          <p className="mt-1 text-sm text-hu-muted">
            Senha de acesso (CPF):{" "}
            <span className="font-mono font-bold text-hu-text">{membroCriado.cpf}</span>
          </p>
          <p className="mt-2 text-xs text-hu-muted">
            Anote e repasse esses dados ao novo membro.
          </p>
          <button
            onClick={() => setMembroCriado(null)}
            className="mt-3 text-sm text-hu-muted underline hover:text-hu-text"
          >
            Fechar
          </button>
        </div>
      )}

      {mostraFormMembro && (
        <form
          onSubmit={onSubmitMembro}
          className="mt-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5 text-hu-text"
        >
          <p className="mb-4 font-pixel text-xs text-hu-text">Novo membro</p>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome" className="text-sm text-hu-text">Nome completo</Label>
              <Input
                id="nome"
                placeholder="Ex: Maria da Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-sm text-hu-text">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="maria@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cpf" className="text-sm text-hu-text">
                CPF <span className="text-hu-muted">(será a senha de acesso)</span>
              </Label>
              <Input
                id="cpf"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                className={`h-11 rounded-lg border-2 bg-hu-bg text-hu-text placeholder:text-hu-muted ${
                  (tentouEnviar || cpfCompleto) && !cpfValido
                    ? "border-red-400"
                    : "border-hu-soft"
                }`}
              />
              {(tentouEnviar || cpfCompleto) && !cpfValido && (
                <p className="text-xs text-red-600">CPF inválido. Confira os números.</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tel" className="text-sm text-hu-text">Telefone</Label>
              <Input
                id="tel"
                inputMode="numeric"
                placeholder="(55) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                className={`h-11 rounded-lg border-2 bg-hu-bg text-hu-text placeholder:text-hu-muted ${
                  (tentouEnviar || telCompleto) && !telValido
                    ? "border-red-400"
                    : "border-hu-soft"
                }`}
              />
              {(tentouEnviar || telCompleto) && !telValido && (
                <p className="text-xs text-red-600">Telefone deve ter 10 ou 11 dígitos.</p>
              )}
            </div>
          </div>

          {criarMembro.isError && (
            <Aviso variante="erro" className="mt-3">
              {criarMembro.error.message}
            </Aviso>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              type="submit"
              disabled={criarMembro.isPending}
              className="h-11 flex-1 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
            >
              {criarMembro.isPending ? "Cadastrando…" : "Cadastrar membro"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={resetFormMembro}
              className="h-11 rounded-xl border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {membros.length === 0 && !mostraFormMembro && !membroCriado && (
        <p className="mt-4 rounded-2xl border-4 border-hu-soft bg-hu-panel p-6 text-center text-sm text-hu-muted">
          Nenhum membro ainda. Clique em "Novo membro" para cadastrar.
        </p>
      )}

      {membros.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {membros.map((m) => {
            const canteiro = canteiroDoMembro(m.id)
            const removendoEste = removerMembro.isPending && removerMembro.variables === m.id
            const confirmarEste = confirmarMembroId === m.id
            return (
              <li
                key={m.id}
                className="rounded-2xl border-4 border-hu-bright bg-hu-panel px-4 py-3 text-hu-text"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{m.nome}</p>
                    <p className="mt-0.5 text-sm text-hu-muted">{m.email}</p>
                    {canteiro ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-hu-text">
                        <UserCheck className="size-3 text-hu-bright" aria-hidden />
                        {canteiro.identificacao}
                      </p>
                    ) : (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-hu-muted">
                        <UserX className="size-3" aria-hidden />
                        Sem canteiro
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setConfirmarMembroId(confirmarEste ? null : m.id)}
                    disabled={removerMembro.isPending}
                    aria-expanded={confirmarEste}
                    className="shrink-0 rounded-lg flex size-11 items-center justify-center border border-red-400/40 text-red-600 hover:bg-red-500/15 disabled:opacity-50"
                    aria-label={`Remover ${m.nome}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
                {confirmarEste && (
                  <ConfirmacaoInline
                    pergunta={<>Remover <strong>{m.nome}</strong> da horta? Não dá pra desfazer.</>}
                    rotuloConfirmar="Sim, remover"
                    rotuloConfirmando="Removendo…"
                    confirmando={removendoEste}
                    aoConfirmar={() => removerMembro.mutate(m.id, { onSuccess: () => setConfirmarMembroId(null) })}
                    aoCancelar={() => setConfirmarMembroId(null)}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}

      {removerMembro.isError && (
        <Aviso variante="erro" className="mt-3">
          {removerMembro.error.message}
        </Aviso>
      )}

      {/* ── CANTEIROS ── */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="font-pixel text-sm text-hu-bright">Canteiros</h2>
        {!mostraFormCanteiro && (
          <Button
            onClick={() => setMostraFormCanteiro(true)}
            className="flex items-center gap-2 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
          >
            <Plus className="size-4" aria-hidden />
            Novo canteiro
          </Button>
        )}
      </div>

      {mostraFormCanteiro && (
        <form
          onSubmit={onSubmitCanteiro}
          className="mt-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5 text-hu-text"
        >
          <p className="mb-4 font-pixel text-xs text-hu-text">Novo canteiro</p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ident" className="text-sm text-hu-text">Nome do canteiro</Label>
            <Input
              id="ident"
              placeholder="Ex: Canteiro A, Lote 3..."
              value={identificacao}
              onChange={(e) => setIdentificacao(e.target.value)}
              required
              className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
            />
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            <Label htmlFor="area" className="text-sm text-hu-text">
              Área produtiva (m²) <span className="text-hu-muted">(opcional)</span>
            </Label>
            <Input
              id="area"
              type="number"
              min="0.1"
              step="0.1"
              placeholder="Ex: 12.5"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
            />
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            <Label htmlFor="membroC" className="text-sm text-hu-text">
              Responsável <span className="text-hu-muted">(opcional)</span>
            </Label>
            <select
              id="membroC"
              value={membroIdCanteiro}
              onChange={(e) => setMembroIdCanteiro(e.target.value === "" ? "" : Number(e.target.value))}
              className="h-11 rounded-lg border-2 border-hu-soft bg-hu-bg px-3 text-hu-text"
            >
              <option value="">Sem responsável por agora</option>
              {membros.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          {criarCanteiro.isError && (
            <Aviso variante="erro" className="mt-3">
              {criarCanteiro.error.message}
            </Aviso>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              type="submit"
              disabled={!identificacao.trim() || criarCanteiro.isPending}
              className="h-11 flex-1 rounded-xl bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
            >
              {criarCanteiro.isPending ? "Criando…" : "Criar canteiro"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetFormCanteiro}
              className="h-11 rounded-xl border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {(canteiros.data ?? []).length === 0 && !mostraFormCanteiro && (
        <p className="mt-4 rounded-2xl border-4 border-hu-soft bg-hu-panel p-6 text-center text-sm text-hu-muted">
          Nenhum canteiro ainda. Clique em "Novo canteiro" para começar.
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {(canteiros.data ?? []).map((c) => {
          const membro = nomeUsuario(c.usuario_id)
          const deletandoEste = deletarCanteiro.isPending && deletarCanteiro.variables === c.id
          const esteAtribuindo = atribuindoId === c.id
          const confirmarCanteiroEste = confirmarCanteiroId === c.id

          return (
            <li key={c.id} className="rounded-2xl border-4 border-hu-bright bg-hu-panel p-4 text-hu-text">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{c.identificacao}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-hu-muted">
                    {membro ? (
                      <>
                        <UserCheck className="size-3.5 text-hu-bright" aria-hidden />
                        {membro}
                      </>
                    ) : (
                      <>
                        <UserX className="size-3.5 text-hu-muted" aria-hidden />
                        <span className="text-hu-muted">Sem responsável</span>
                      </>
                    )}
                    {c.area_produtiva ? ` · ${c.area_produtiva} m²` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => {
                      setAtribuindoId(esteAtribuindo ? null : c.id)
                      setNovoMembroId(c.usuario_id ?? "")
                    }}
                    className="min-h-11 rounded-lg border border-hu-soft/40 px-3 text-sm text-hu-muted hover:bg-black/5"
                  >
                    {esteAtribuindo ? "Fechar" : "Responsável"}
                  </button>
                  <button
                    onClick={() => setConfirmarCanteiroId(confirmarCanteiroEste ? null : c.id)}
                    disabled={deletarCanteiro.isPending}
                    aria-expanded={confirmarCanteiroEste}
                    className="rounded-lg flex size-11 items-center justify-center border border-red-400/40 text-red-600 hover:bg-red-500/15 disabled:opacity-50"
                    aria-label={`Excluir ${c.identificacao}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>

              {confirmarCanteiroEste && (
                <ConfirmacaoInline
                  pergunta={<>Excluir o canteiro <strong>{c.identificacao}</strong> e o que está ligado a ele? Não dá pra desfazer.</>}
                  confirmando={deletandoEste}
                  aoConfirmar={() => deletarCanteiro.mutate(c.id, { onSuccess: () => setConfirmarCanteiroId(null) })}
                  aoCancelar={() => setConfirmarCanteiroId(null)}
                />
              )}

              {esteAtribuindo && (
                <form
                  onSubmit={(e) => onSubmitAtribuir(e, c.id)}
                  className="mt-3 flex items-center gap-2 border-t border-hu-soft/30 pt-3"
                >
                  <select
                    value={novoMembroId}
                    onChange={(e) =>
                      setNovoMembroId(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="h-10 flex-1 rounded-lg border-2 border-hu-soft bg-hu-bg px-3 text-sm text-hu-text"
                  >
                    <option value="">Sem responsável</option>
                    {membros.map((u) => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={atualizarCanteiro.isPending}
                    className="rounded-lg bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
                  >
                    {atualizarCanteiro.isPending && atribuindoId === c.id ? "Salvando…" : "Salvar"}
                  </Button>
                </form>
              )}
            </li>
          )
        })}
      </ul>

      {(deletarCanteiro.isError || atualizarCanteiro.isError) && (
        <Aviso variante="erro" className="mt-4">
          {deletarCanteiro.error?.message ?? atualizarCanteiro.error?.message}
        </Aviso>
      )}
    </div>
  )
}
