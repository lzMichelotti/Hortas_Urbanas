import type { components } from "@/lib/api/schema"

export type Sexo = components["schemas"]["Sexo"]
export type RacaCor = components["schemas"]["RacaCor"]

export type DadosHorticultor = {
  nascimento_ano: number | null
  sexo: Sexo | null
  raca_cor: RacaCor | null
  grupo_familiar: number | null
}

export const HORTICULTOR_VAZIO: DadosHorticultor = {
  nascimento_ano: null,
  sexo: null,
  raca_cor: null,
  grupo_familiar: null,
}

// Mesma faixa validada em app/schemas/usuario.py.
export const IDADE_MINIMA = 5
export const IDADE_MAXIMA = 120

export const SEXOS: { valor: Sexo; rotulo: string }[] = [
  { valor: "FEMININO", rotulo: "Feminino" },
  { valor: "MASCULINO", rotulo: "Masculino" },
  { valor: "OUTRO", rotulo: "Outro" },
]

export const RACAS: { valor: RacaCor; rotulo: string }[] = [
  { valor: "BRANCA", rotulo: "Branca" },
  { valor: "PRETA", rotulo: "Preta" },
  { valor: "PARDA", rotulo: "Parda" },
  { valor: "AMARELA", rotulo: "Amarela" },
  { valor: "INDIGENA", rotulo: "Indígena" },
]

export const NAO_INFORMADO = "Prefiro não dizer"
