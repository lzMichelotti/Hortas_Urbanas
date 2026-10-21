// Formatos de docs/api-coordenador.md (API v1). Só o que o app usa.

export type OrigemHora = "valida" | "reconstruida" | "sem_hora"
export type EstadoSensor = "ok" | "erro" | "fora_de_faixa"
export type ClasseSolo = "seco" | "umido" | "muito_umido"
export type ModoEnergia = "normal" | "economia" | "critico"

export interface StatusCoordenador {
  // Revisão 1.1: chave de uma leitura fora do coordenador = (coordenador, geracao, id).
  coordenador: string
  firmware: string
  protocolo: number
  api: number
  boot: number
  uptime_s: number
  hora: {
    utc: string | null
    valida: boolean
    fonte: "nenhuma" | "manual" | "herdada"
  }
  armazenamento: {
    estado: "ok" | "formatado_no_boot" | "espaco_baixo" | "falhas_de_gravacao" | "nao_montado"
    geracao: string | null
    total_kb: number
    usado_kb: number
    registros: number
    mais_antigo_utc: string | null
  }
  rede: { canal: number; clientes: number }
  escrita_habilitada: boolean
}

export interface Leitura {
  mac: string
  nome: string
  hora: { utc: string | null; origem: OrigemHora }
  idade_s: number
  temperatura_c: number | null
  umidade_ar_pct: number | null
  solo_mv: number | null
  solo_pct: number | null
  alimentacao_mv: number | null
  estados: { temperatura: EstadoSensor; umidade_ar: EstadoSensor; solo: EstadoSensor; alimentacao: EstadoSensor }
  // Ainda não existe na API: a classificação passa ao coordenador na Etapa 9.
  solo_classe?: ClasseSolo
}

export interface LeituraHistorico extends Leitura {
  id: number
  rssi_dbm: number | null
  no_boot: number
  no_seq: number
  perdidos_antes: number
}

export interface PaginaLeituras {
  leituras: LeituraHistorico[]
  proximo_cursor: number | null
  fim: boolean
  cursor_rotacionado: boolean
}

export interface NoCoordenador {
  mac: string
  nome: string
  cadastrado: boolean
  visto: { ha_s: number } | null
  bateria_mv: number | null
  ultima_leitura: Leitura | null
  // Ainda não existe na API: depende de o nó mandar o modo no pacote (firmware).
  modo_energia?: ModoEnergia
}

export interface Alerta {
  tipo: string
  mac?: string
  desde?: { utc: string | null; origem: OrigemHora }
  valor?: number
  limiar?: number
}

export interface ErroApiCoordenador {
  erro: { codigo: string; campo?: string; mensagem: string }
}
