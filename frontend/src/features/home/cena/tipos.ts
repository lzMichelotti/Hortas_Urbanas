export type AcaoCena =
  | { tipo: "rota"; para: string }
  | { tipo: "folha"; folha: FolhaId }
  | { tipo: "conteudo" }

export type FolhaId = "menu"

export type Asset =
  | { tipo: "maquete"; maquete: import("@/features/home/cena/maquetes").MaqueteId }
  | { tipo: "sprite"; src: string }

export type BadgeFonte = "prontas" | "pedidos" | "solicitacoes"

export interface ObjetoCena {
  id: string
  label: string
  x: number
  y: number
  largura: number
  proporcao: number
  acao: AcaoCena
  asset?: Asset
  destaque?: boolean
  badge?: BadgeFonte
  rotacao?: number
  semRotulo?: boolean
  z?: number
}

export interface Cena {
  proporcao: number
  objetos: ObjetoCena[]
}
