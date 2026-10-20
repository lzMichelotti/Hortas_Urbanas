import { registerPlugin, type PluginListenerHandle } from "@capacitor/core"

export interface RespostaNativa {
  status: number
  corpo: string
  duracaoMs: number
}

interface CoordenadorPlugin {
  conectar(): Promise<void>
  desconectar(): Promise<void>
  requisitar(opcoes: { url: string; metodo?: string; corpo?: string }): Promise<RespostaNativa>
  abrirConfiguracoesWifi(): Promise<void>
  addListener(evento: "redePerdida" | "redeDisponivel", fn: () => void): Promise<PluginListenerHandle>
}

export const Coordenador = registerPlugin<CoordenadorPlugin>("Coordenador")
