import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  IDADE_MAXIMA,
  IDADE_MINIMA,
  NAO_INFORMADO,
  RACAS,
  SEXOS,
  type DadosHorticultor,
  type RacaCor,
  type Sexo,
} from "@/features/usuarios/horticultor"

const CAMPO = "h-11 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
const SELECT = "h-11 rounded-lg border-2 border-hu-soft bg-hu-bg px-3 text-hu-text"

export function CamposHorticultor({
  prefixo,
  valor,
  aoMudar,
}: {
  prefixo: string
  valor: DadosHorticultor
  aoMudar: (dados: DadosHorticultor) => void
}) {
  const anoAtual = new Date().getFullYear()
  const anoMin = anoAtual - IDADE_MAXIMA
  const anoMax = anoAtual - IDADE_MINIMA
  const ano = valor.nascimento_ano
  const idade = ano !== null && ano >= anoMin && ano <= anoMax ? anoAtual - ano : null

  const mudar = <C extends keyof DadosHorticultor>(campo: C, novo: DadosHorticultor[C]) =>
    aoMudar({ ...valor, [campo]: novo })

  const numero = (texto: string) => (texto === "" ? null : Number(texto))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefixo}-ano`} className="text-sm text-hu-text">
          Ano de nascimento
        </Label>
        <Input
          id={`${prefixo}-ano`}
          type="number"
          inputMode="numeric"
          min={anoMin}
          max={anoMax}
          step="1"
          placeholder="Ex: 1955"
          value={ano ?? ""}
          onChange={(e) => mudar("nascimento_ano", numero(e.target.value))}
          className={CAMPO}
        />
        {idade !== null && <p className="text-xs text-hu-muted">Idade: {idade} anos</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefixo}-sexo`} className="text-sm text-hu-text">
          Sexo
        </Label>
        <select
          id={`${prefixo}-sexo`}
          value={valor.sexo ?? ""}
          onChange={(e) => mudar("sexo", e.target.value === "" ? null : (e.target.value as Sexo))}
          className={SELECT}
        >
          <option value="">{NAO_INFORMADO}</option>
          {SEXOS.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefixo}-raca`} className="text-sm text-hu-text">
          Cor ou raça
        </Label>
        <select
          id={`${prefixo}-raca`}
          value={valor.raca_cor ?? ""}
          onChange={(e) =>
            mudar("raca_cor", e.target.value === "" ? null : (e.target.value as RacaCor))
          }
          className={SELECT}
        >
          <option value="">{NAO_INFORMADO}</option>
          {RACAS.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefixo}-familia`} className="text-sm text-hu-text">
          Quantas pessoas moram na casa
        </Label>
        <Input
          id={`${prefixo}-familia`}
          type="number"
          inputMode="numeric"
          min="1"
          max="30"
          step="1"
          placeholder="Ex: 4"
          value={valor.grupo_familiar ?? ""}
          onChange={(e) => mudar("grupo_familiar", numero(e.target.value))}
          className={CAMPO}
        />
        <p className="text-xs text-hu-muted">Conte todo mundo que mora junto.</p>
      </div>
    </div>
  )
}
