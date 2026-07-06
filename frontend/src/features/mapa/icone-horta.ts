import L from "leaflet"
import type { components } from "@/lib/api/schema"
import { COR_SITUACAO } from "@/features/mapa/cores"

type Situacao = components["schemas"]["SituacaoHorta"]

const MUDINHA = `<svg viewBox="0 0 5 7" width="20" height="28" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="1" height="1" fill="#4ccc6f"/><rect x="4" y="0" width="1" height="1" fill="#4ccc6f"/>
<rect x="0" y="1" width="1" height="1" fill="#4ccc6f"/><rect x="1" y="1" width="1" height="1" fill="#4ccc6f"/><rect x="3" y="1" width="1" height="1" fill="#4ccc6f"/><rect x="4" y="1" width="1" height="1" fill="#4ccc6f"/>
<rect x="1" y="2" width="1" height="1" fill="#4ccc6f"/><rect x="2" y="2" width="1" height="1" fill="#4ccc6f"/><rect x="3" y="2" width="1" height="1" fill="#4ccc6f"/>
<rect x="2" y="3" width="1" height="1" fill="#2e8b57"/><rect x="2" y="4" width="1" height="1" fill="#2e8b57"/>
<rect x="0" y="5" width="5" height="2" fill="#8a5a2b"/>
</svg>`

const cacheHorta = new Map<string, L.DivIcon>()

// Símbolo redundante à cor (WCAG 1.4.1): a situação não fica só na cor do anel.
// Explicado na legenda do mapa (ver mapa.tsx).
export const SIMBOLO_SITUACAO: Record<Situacao, string> = {
  segura: "",
  monitoramento: "i",
  alerta: "!",
  dentro: "‼",
}

export function criarIconeHorta(situacao: Situacao, emEmergencia: boolean): L.DivIcon {
  const chave = `${situacao}|${emEmergencia}`
  const emCache = cacheHorta.get(chave)
  if (emCache) return emCache

  const cor = emEmergencia ? "#e63946" : COR_SITUACAO[situacao]
  const borda = emEmergencia ? 5 : 4
  const sombra = emEmergencia ? "" : "box-shadow:0 2px 6px rgba(0,0,0,.35);"
  const classe = emEmergencia ? "hu-pulse" : ""
  const simbolo = emEmergencia ? "‼" : SIMBOLO_SITUACAO[situacao]
  const selo = simbolo
    ? `<span style="position:absolute;top:-5px;right:-5px;min-width:17px;height:17px;padding:0 3px;border-radius:9px;background:${cor};color:#fff;border:2px solid #f4fff7;font:700 11px/13px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">${simbolo}</span>`
    : ""
  const html = `<div class="${classe}" style="position:relative;width:34px;height:34px;border-radius:50%;background:#f4fff7;border:${borda}px solid ${cor};${sombra}display:flex;align-items:center;justify-content:center;">${MUDINHA}${selo}</div>`
  const icone = L.divIcon({
    html,
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  })
  cacheHorta.set(chave, icone)
  return icone
}

export function criarIconePonto(): L.DivIcon {
  const html = `<div style="width:16px;height:16px;border-radius:50%;background:#1d6fa4;border:3px solid #fff;box-shadow:0 0 0 2px #1d6fa4,0 2px 6px rgba(0,0,0,.3);"></div>`
  return L.divIcon({ html, className: "", iconSize: [16, 16], iconAnchor: [8, 8] })
}
