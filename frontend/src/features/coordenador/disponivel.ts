import { Capacitor } from "@capacitor/core"

// Separado do api.ts para o menu da home não carregar a camada do coordenador.
// No navegador o PWA é HTTPS e não alcança o http:// da rede da horta (conteúdo misto).
export const coordenadorDisponivel =
  Capacitor.isNativePlatform() && Boolean(import.meta.env.VITE_COORDENADOR_URL)
