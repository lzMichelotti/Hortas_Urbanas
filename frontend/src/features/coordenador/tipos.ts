// Formatos de docs/api-coordenador.md (API v1). Só o que o app usa.

export type OrigemHora = "valida" | "reconstruida" | "sem_hora"

export interface StatusCoordenador {
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
    total_kb: number
    usado_kb: number
    registros: number
    mais_antigo_utc: string | null
  }
  rede: { canal: number; clientes: number }
  escrita_habilitada: boolean
}

export interface ErroApiCoordenador {
  erro: { codigo: string; campo?: string; mensagem: string }
}
