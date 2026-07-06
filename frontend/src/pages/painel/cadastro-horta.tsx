import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { useCadastrarHorta } from "@/features/hortas/use-cadastrar-horta"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SeletorLocal } from "@/features/hortas/seletor-local"
import {
  FONTES_AGUA,
  NIVEIS_VULNERABILIDADE,
  PRATICAS,
  TIPOS_SOLO,
  UFS,
  type FonteAgua,
  type NivelVulnerabilidade,
  type PraticaCultivo,
  type TipoSolo,
} from "@/features/hortas/rotulos"
import { Aviso } from "@/components/feedback"

const VAZIO = {
  nome: "",
  area_total: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  publico_atendido: "",
  lider_nome: "",
  lider_email: "",
  lider_cpf: "",
  lider_telefone: "",
}

type Campos = typeof VAZIO

const INPUT_CLASS = "h-12 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
const SELECT_CLASS = `${INPUT_CLASS} w-full px-3 py-2 text-sm focus:outline-none focus:border-hu-bright`

function Campo({
  id,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  placeholder,
  maxLength,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  inputMode?: "text" | "numeric" | "email" | "tel"
  placeholder?: string
  maxLength?: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm text-hu-text">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
      />
    </div>
  )
}

function Selecionar<T extends string>({
  id,
  label,
  value,
  onChange,
  opcoes,
  placeholder = "Não informado",
}: {
  id: string
  label: string
  value: T | null
  onChange: (v: T | null) => void
  opcoes: { valor: T; label: string }[]
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm text-hu-text">
        {label}
      </Label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value || null) as T | null)}
        className={SELECT_CLASS}
      >
        <option value="">{placeholder}</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function CadastroHortaPage() {
  const cadastrar = useCadastrarHorta()
  const [form, setForm] = useState<Campos>(VAZIO)
  const [local, setLocal] = useState<{ lat: number; lng: number } | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [tentou, setTentou] = useState(false)

  // Seção adicional
  const [adicionalAberto, setAdicionalAberto] = useState(false)
  const [temCisterna, setTemCisterna] = useState<boolean | null>(null)
  const [fonteAgua, setFonteAgua] = useState<FonteAgua | null>(null)
  const [tipoSolo, setTipoSolo] = useState<TipoSolo | null>(null)
  const [areaPermeavel, setAreaPermeavel] = useState("")
  const [nivelVulnerabilidade, setNivelVulnerabilidade] = useState<NivelVulnerabilidade | null>(null)
  const [praticas, setPraticas] = useState<PraticaCultivo[]>([])

  const set = (campo: keyof Campos, valor: string) => setForm((f) => ({ ...f, [campo]: valor }))

  function togglePratica(p: PraticaCultivo) {
    setPraticas((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    )
  }

  function resetAdicional() {
    setTemCisterna(null)
    setFonteAgua(null)
    setTipoSolo(null)
    setAreaPermeavel("")
    setNivelVulnerabilidade(null)
    setPraticas([])
  }

  const area = Number(form.area_total.replace(",", "."))
  const podeEnviar =
    form.nome.trim() !== "" &&
    area > 0 &&
    form.lider_nome.trim() !== "" &&
    form.lider_email.trim() !== "" &&
    form.lider_cpf.length === 11 &&
    form.lider_telefone.trim() !== ""
  const faltas = [
    form.nome.trim() === "" && "nome da horta",
    !(area > 0) && "área total",
    form.lider_nome.trim() === "" && "nome do líder",
    form.lider_email.trim() === "" && "e-mail do líder",
    form.lider_cpf.length !== 11 && "CPF do líder (11 números)",
    form.lider_telefone.trim() === "" && "telefone do líder",
  ].filter(Boolean) as string[]

  function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setTentou(true)
    if (!podeEnviar) return
    setSucesso(null)
    const apNum = Number(areaPermeavel.replace(",", "."))
    cadastrar.mutate(
      {
        horta: {
          nome: form.nome.trim(),
          area_total: area,
          rua: form.rua.trim() || null,
          numero: form.numero.trim() || null,
          bairro: form.bairro.trim() || null,
          cidade: form.cidade.trim() || null,
          uf: form.uf.trim() || null,
          cep: form.cep.trim() || null,
          publico_atendido: form.publico_atendido.trim() || null,
          latitude: local?.lat ?? null,
          longitude: local?.lng ?? null,
          tem_cisterna: temCisterna,
          fonte_agua: fonteAgua,
          tipo_solo: tipoSolo,
          area_permeavel: areaPermeavel.trim() !== "" && !isNaN(apNum) ? apNum : null,
          nivel_vulnerabilidade: nivelVulnerabilidade,
          praticas_cultivo: praticas.length > 0 ? praticas : null,
        },
        lider: {
          nome: form.lider_nome.trim(),
          email: form.lider_email.trim(),
          cpf: form.lider_cpf,
          telefone: form.lider_telefone.trim(),
        },
      },
      {
        onSuccess: (data) => {
          setSucesso(`Horta "${data.horta.nome}" cadastrada! Líder: ${data.lider.email}`)
          setForm(VAZIO)
          setLocal(null)
          resetAdicional()
          setAdicionalAberto(false)
          setTentou(false)
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Voltar />

      <form
        onSubmit={onSubmit}
        className="mt-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-6 text-hu-text"
      >
        <h1 className="font-pixel text-sm text-hu-text">Cadastrar horta + líder</h1>

        <p className="mt-6 font-pixel text-xs text-hu-text">Dados da horta</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="nome" label="Nome da horta *" value={form.nome} onChange={(v) => set("nome", v)} placeholder="Ex.: Horta do Centro" />
          <Campo id="area" label="Área total (m²) *" value={form.area_total} onChange={(v) => set("area_total", v)} inputMode="numeric" placeholder="450" />
          <Campo id="rua" label="Rua" value={form.rua} onChange={(v) => set("rua", v)} />
          <Campo id="numero" label="Número" value={form.numero} onChange={(v) => set("numero", v)} />
          <Campo id="bairro" label="Bairro" value={form.bairro} onChange={(v) => set("bairro", v)} />
          <Campo id="cidade" label="Cidade" value={form.cidade} onChange={(v) => set("cidade", v)} />
          <Selecionar id="uf" label="Estado (UF)" value={form.uf || null} onChange={(v) => set("uf", v ?? "")} opcoes={UFS} placeholder="Escolha" />
          <Campo id="cep" label="CEP" value={form.cep} onChange={(v) => set("cep", v)} inputMode="numeric" />
        </div>
        <div className="mt-4">
          <Campo id="publico" label="Público atendido" value={form.publico_atendido} onChange={(v) => set("publico_atendido", v)} placeholder="Ex.: moradores e escolas da região" />
        </div>

        <div className="mt-4">
          <Label className="text-sm text-hu-text">Localização no mapa</Label>
          <div className="mt-1.5">
            <SeletorLocal value={local} onChange={setLocal} />
          </div>
        </div>

        {/* Seção adicional — dados de resiliência climática */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setAdicionalAberto((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-hu-soft bg-hu-bg px-4 py-3 text-left hover:border-hu-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
            aria-expanded={adicionalAberto}
          >
            <span className="font-pixel text-xs text-hu-text/80">
              Dados de resiliência climática
            </span>
            <ChevronDown
              className={`size-4 text-hu-muted transition-transform duration-200 ${adicionalAberto ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>

          {adicionalAberto && (
            <div className="mt-3 rounded-xl border-2 border-hu-soft bg-hu-bg/40 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Tem cisterna */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm text-hu-text">Tem cisterna?</span>
                  <div className="flex gap-2">
                    {(["Sim", "Não", "—"] as const).map((label) => {
                      const val = label === "Sim" ? true : label === "Não" ? false : null
                      const ativo = temCisterna === val
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setTemCisterna(val)}
                          aria-pressed={ativo}
                          className={`flex-1 rounded-lg border-2 py-2 text-sm transition-colors ${
                            ativo
                              ? "border-hu-bright bg-hu-bright/20 text-hu-text"
                              : "border-hu-soft bg-transparent text-hu-muted hover:border-white/40"
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Fonte de água */}
                <Selecionar
                  id="fonte_agua"
                  label="Fonte de água"
                  value={fonteAgua}
                  onChange={setFonteAgua}
                  opcoes={FONTES_AGUA}
                />

                {/* Tipo de solo */}
                <Selecionar
                  id="tipo_solo"
                  label="Tipo de solo"
                  value={tipoSolo}
                  onChange={setTipoSolo}
                  opcoes={TIPOS_SOLO}
                />

                {/* Área permeável */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="area_permeavel" className="text-sm text-hu-text">
                    Área permeável (%)
                  </Label>
                  <Input
                    id="area_permeavel"
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex.: 60"
                    value={areaPermeavel}
                    onChange={(e) => setAreaPermeavel(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                {/* Nível de vulnerabilidade */}
                <Selecionar
                  id="nivel_vulnerabilidade"
                  label="Nível de vulnerabilidade climática"
                  value={nivelVulnerabilidade}
                  onChange={setNivelVulnerabilidade}
                  opcoes={NIVEIS_VULNERABILIDADE}
                />
              </div>

              {/* Práticas de cultivo */}
              <div className="mt-4 flex flex-col gap-2">
                <span className="text-sm text-hu-text">Práticas sustentáveis</span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {PRATICAS.map((p) => {
                    const ativo = praticas.includes(p.valor)
                    return (
                      <button
                        key={p.valor}
                        type="button"
                        onClick={() => togglePratica(p.valor)}
                        aria-pressed={ativo}
                        className={`rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors ${
                          ativo
                            ? "border-hu-bright bg-hu-bright/20 text-hu-text"
                            : "border-hu-soft bg-transparent text-hu-muted hover:border-white/40"
                        }`}
                      >
                        {ativo ? "✓ " : ""}{p.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-8 font-pixel text-xs text-hu-text">Dados do líder</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="lnome" label="Nome *" value={form.lider_nome} onChange={(v) => set("lider_nome", v)} />
          <Campo id="lemail" label="E-mail *" value={form.lider_email} onChange={(v) => set("lider_email", v)} type="email" inputMode="email" placeholder="lider@exemplo.com" />
          <Campo id="lcpf" label="CPF * (só números)" value={form.lider_cpf} onChange={(v) => set("lider_cpf", v.replace(/\D/g, "").slice(0, 11))} inputMode="numeric" maxLength={11} placeholder="00000000000" />
          <Campo id="ltel" label="Telefone *" value={form.lider_telefone} onChange={(v) => set("lider_telefone", v)} inputMode="tel" placeholder="(55) 99999-9999" />
        </div>

        {cadastrar.isError && (
          <Aviso variante="erro" className="mt-6">
            {cadastrar.error.message}
          </Aviso>
        )}
        {sucesso && (
          <Aviso variante="sucesso" className="mt-6">
            {sucesso}
          </Aviso>
        )}

        {tentou && faltas.length > 0 && (
          <Aviso variante="info" className="mt-6">
            Para cadastrar, falta {faltas.join(" · ")}.
          </Aviso>
        )}

        <Button
          type="submit"
          disabled={cadastrar.isPending}
          className="mt-6 h-14 w-full rounded-xl bg-hu-bright text-lg font-bold text-hu-bg hover:bg-hu-bright/90"
        >
          {cadastrar.isPending ? "Cadastrando…" : "Cadastrar horta"}
        </Button>
      </form>
    </div>
  )
}
