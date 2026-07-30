import "leaflet/dist/leaflet.css"
import L from "leaflet"
import type { Feature, GeoJsonObject } from "geojson"
import type { LeafletMouseEvent, PathOptions } from "leaflet"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import {
  Circle,
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
  ZoomControl,
} from "react-leaflet"
import { endereco } from "@/lib/utils"
import type { components } from "@/lib/api/schema"
import {
  useAlertasAtivos,
  useBuscarProximas,
  useMapaCompleto,
  useMapaRiscos,
} from "@/features/mapa/use-mapa"
import { CloudSun, Search } from "lucide-react"
import { criarIconeHorta, criarIconePonto, SIMBOLO_SITUACAO } from "@/features/mapa/icone-horta"
import { obterLocalizacao } from "@/features/mapa/gps"
import { ClimaWidget, ConteudoClima } from "@/features/mapa/clima-widget"
import { isAuthenticated } from "@/lib/auth/session"
import {
  CENTRO_SANTA_MARIA,
  COR_NIVEL,
  COR_SITUACAO,
  LIMITES_SANTA_MARIA,
  ROTULO_SITUACAO,
  ZOOM_MAX,
  ZOOM_MIN,
} from "@/features/mapa/cores"
import { Button } from "@/components/ui/button"
import { FolhaInferior } from "@/components/ui/folha-inferior"

type Situacao = components["schemas"]["SituacaoHorta"]
type HortaCompleta = components["schemas"]["PropriedadesHortaCompleta"]
type HortaSimples = components["schemas"]["PropriedadesHorta"]

interface PropsZona {
  nome: string
  tipo: string
  nivel: "alto" | "medio" | "baixo"
  descricao?: string | null
  ativa: boolean
  data_ocorrencia?: string | null
}

const SITUACOES = ["segura", "monitoramento", "alerta", "dentro"] as const
const NIVEIS = ["alto", "medio", "baixo"] as const
const PONTO_ICONE = criarIconePonto()

function estiloZona(feature?: Feature): PathOptions {
  const p = feature?.properties as PropsZona | undefined
  const cor = p ? COR_NIVEL[p.nivel] : "#999999"
  return p?.ativa
    ? { color: cor, weight: 3, fillColor: cor, fillOpacity: 0.5 }
    : { color: cor, weight: 2, fillColor: cor, fillOpacity: 0.25, dashArray: "6" }
}

function esc(s: string): string {
  const mapa: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }
  return s.replace(/[&<>"']/g, (c) => mapa[c])
}

function popupZonaHtml(p: PropsZona): string {
  const data = p.data_ocorrencia
    ? `<p style="margin:4px 0">Início: ${esc(new Date(p.data_ocorrencia).toLocaleString("pt-BR"))}</p>`
    : ""
  const badge = p.ativa
    ? `<strong style="color:#ffd60a">⚠ EMERGÊNCIA ATIVA</strong>`
    : `<span style="opacity:.8">Zona histórica</span>`
  return `<div style="min-width:160px">
    <strong>${esc(p.nome)}</strong>
    <p style="margin:4px 0">Tipo: ${esc(p.tipo)} · Nível: ${esc(p.nivel)}</p>
    ${p.descricao ? `<p style="margin:4px 0">${esc(p.descricao)}</p>` : ""}
    ${data}${badge}
  </div>`
}

function BadgeSituacao({ situacao, emergencia, zonaTipo }: { situacao: Situacao; emergencia: boolean; zonaTipo?: string }) {
  return (
    <span
      className="mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-bold text-hu-text"
      style={{ background: COR_SITUACAO[situacao] }}
    >
      {ROTULO_SITUACAO[situacao]}
      {emergencia ? " · emergência" : ""}
      {zonaTipo ? ` (${zonaTipo})` : ""}
    </span>
  )
}

function CliqueNoMapa({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e: LeafletMouseEvent) => onPick(e.latlng.lat, e.latlng.lng),
  })
  return null
}

export function MapaPage() {
  const logado = isAuthenticated()
  const completo = useMapaCompleto()
  const riscos = useMapaRiscos()
  const alertas = useAlertasAtivos()
  const proximas = useBuscarProximas()

  const mapRef = useRef<L.Map | null>(null)
  const [ponto, setPonto] = useState<{ lat: number; lng: number } | null>(null)
  const [raioKm, setRaioKm] = useState(2)
  const [gpsErro, setGpsErro] = useState<string | null>(null)
  const [buscaAberta, setBuscaAberta] = useState(false)

  const buscaAtiva = proximas.data != null

  const infoPorId = useMemo(() => {
    const m = new Map<number, { situacao: Situacao; emergencia: boolean }>()
    completo.data?.features.forEach((f) =>
      m.set(f.properties.id, {
        situacao: f.properties.situacao,
        emergencia: f.properties.em_emergencia,
      }),
    )
    return m
  }, [completo.data])

  const resumo = useMemo(() => {
    const fs = completo.data?.features ?? []
    const conta = (s: Situacao) => fs.filter((f) => f.properties.situacao === s).length
    return {
      total: fs.length,
      dentro: conta("dentro"),
      alerta: conta("alerta"),
      monitoramento: conta("monitoramento"),
    }
  }, [completo.data])

  const totalAlertas = alertas.data?.features.length ?? 0

  function usarGPS() {
    setGpsErro(null)
    obterLocalizacao()
      .then(({ lat, lng }) => {
        setPonto({ lat, lng })
        mapRef.current?.setView([lat, lng], 14)
      })
      .catch((e: Error) => setGpsErro(e.message))
  }

  function buscar() {
    if (!ponto) return
    proximas.mutate(
      { lat: ponto.lat, lng: ponto.lng, raioKm },
      {
        onSuccess: () => {
          setBuscaAberta(false) // fecha a folha no mobile para ver o resultado
          mapRef.current?.fitBounds(
            L.latLng(ponto.lat, ponto.lng).toBounds(raioKm * 2000),
            { padding: [40, 40] },
          )
        },
      },
    )
  }

  function limpar() {
    setPonto(null)
    proximas.reset()
  }

  useEffect(() => {
    if (!ponto || proximas.data == null) return
    const t = setTimeout(() => proximas.mutate({ lat: ponto.lat, lng: ponto.lng, raioKm }), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raioKm])

  const controlesBusca = (
    <>
      <Button onClick={usarGPS} className="h-11 rounded-lg bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90">
        Usar minha localização
      </Button>
      <p className="text-center text-xs text-hu-muted">ou clique no mapa</p>
      {gpsErro && (
        <p role="alert" className="rounded-lg bg-[#e63946] px-3 py-2 text-center text-xs font-medium text-hu-text">
          {gpsErro}
        </p>
      )}
      {ponto && (
        <p className="rounded-lg bg-hu-bg px-3 py-1 text-center text-xs">
          {ponto.lat.toFixed(5)}, {ponto.lng.toFixed(5)}
        </p>
      )}

      <div>
        <div className="flex items-center justify-between text-xs">
          <span>Raio de busca</span>
          <span className="font-bold text-hu-text">{raioKm} km</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={20}
          step={0.5}
          value={raioKm}
          onChange={(e) => setRaioKm(Number(e.target.value))}
          className="mt-1 h-6 w-full accent-[#4ccc6f]"
        />
        <div className="mt-2 flex gap-1.5">
          {[1, 2, 5, 10].map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => setRaioKm(km)}
              aria-pressed={raioKm === km}
              className={`min-h-11 flex-1 rounded-lg border-2 text-sm font-bold ${
                raioKm === km ? "border-hu-bright bg-hu-bright/20 text-hu-text" : "border-hu-soft text-hu-muted hover:bg-black/5"
              }`}
            >
              {km} km
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={buscar}
        disabled={!ponto || proximas.isPending}
        className="h-11 rounded-lg bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90"
      >
        {proximas.isPending ? "Buscando…" : "Buscar hortas próximas"}
      </Button>
      {buscaAtiva && (
        <>
          <p className="text-center text-sm">
            <span className="font-pixel text-base text-hu-text">{proximas.data?.features.length ?? 0}</span> horta(s) num raio de {raioKm} km
          </p>
          <Button onClick={limpar} variant="outline" className="h-11 rounded-lg border-hu-bright bg-transparent text-hu-text hover:bg-black/5">
            Limpar busca
          </Button>
        </>
      )}
    </>
  )

  const legenda = (
    <>
      <p className="font-pixel text-xs text-hu-text">Situação</p>
      <ul className="mt-2 space-y-1 text-xs">
        {SITUACOES.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className="inline-flex size-4 items-center justify-center rounded-full text-[10px] font-bold leading-none text-hu-text"
              style={{ background: COR_SITUACAO[s] }}
              aria-hidden
            >
              {SIMBOLO_SITUACAO[s]}
            </span>
            {ROTULO_SITUACAO[s]}
          </li>
        ))}
      </ul>
      <p className="mt-3 font-pixel text-xs text-hu-text">Nível de risco</p>
      <ul className="mt-2 space-y-1 text-xs">
        {NIVEIS.map((n) => (
          <li key={n} className="flex items-center gap-2">
            <span className="inline-block size-3 rounded-sm" style={{ background: COR_NIVEL[n] }} />
            {n.charAt(0).toUpperCase() + n.slice(1)}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-hu-muted">
        Zona ativa = sólida · histórica = tracejada
      </p>
    </>
  )

  return (
    <div className="relative h-svh w-full">
      <MapContainer
        ref={mapRef}
        center={CENTRO_SANTA_MARIA}
        zoom={13}
        minZoom={ZOOM_MIN}
        maxBounds={LIMITES_SANTA_MARIA}
        maxBoundsViscosity={1}
        zoomControl={false}
        className="absolute inset-0 z-0"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={ZOOM_MAX}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <ZoomControl position="bottomright" />

        <CliqueNoMapa onPick={(lat, lng) => setPonto({ lat, lng })} />

        {riscos.data && (
          <GeoJSON
            key={`z-${riscos.data.features.length}`}
            data={riscos.data as unknown as GeoJsonObject}
            style={estiloZona}
            onEachFeature={(feature, layer) => {
              const p = feature.properties as PropsZona
              layer.bindPopup(popupZonaHtml(p))
              layer.on("mouseover", () =>
                (layer as L.Path).setStyle({ fillOpacity: p.ativa ? 0.65 : 0.4 }),
              )
              layer.on("mouseout", () =>
                (layer as L.Path).setStyle({ fillOpacity: p.ativa ? 0.5 : 0.25 }),
              )
            }}
          />
        )}

        {!buscaAtiva &&
          completo.data?.features.map((f) => {
            const [lng, lat] = f.geometry.coordinates
            const p = f.properties as HortaCompleta
            return (
              <Marker
                key={p.id}
                position={[lat, lng] as [number, number]}
                icon={criarIconeHorta(p.situacao, p.em_emergencia)}
              >
                <Popup>
                  <span className="font-pixel text-xs leading-snug text-hu-text">{p.nome}</span>
                  {endereco(p) && <p className="mt-1 text-sm text-hu-text">{endereco(p)}</p>}
                  <p className="text-sm text-hu-text">Área: {p.area_total} m²</p>
                  {p.publico_atendido && <p className="text-sm text-hu-text/80">{p.publico_atendido}</p>}
                  <BadgeSituacao situacao={p.situacao} emergencia={p.em_emergencia} zonaTipo={p.zona_risco?.tipo} />
                </Popup>
              </Marker>
            )
          })}

        {buscaAtiva &&
          proximas.data?.features.map((f) => {
            const [lng, lat] = f.geometry.coordinates
            const p = f.properties as HortaSimples
            const info = infoPorId.get(p.id)
            const situacao = info?.situacao ?? "segura"
            return (
              <Marker
                key={p.id}
                position={[lat, lng] as [number, number]}
                icon={criarIconeHorta(situacao, info?.emergencia ?? false)}
              >
                <Popup>
                  <span className="font-pixel text-xs leading-snug text-hu-text">{p.nome}</span>
                  {endereco(p) && <p className="mt-1 text-sm text-hu-text">{endereco(p)}</p>}
                  {p.area_total && <p className="text-sm text-hu-text">Área: {p.area_total} m²</p>}
                  <BadgeSituacao situacao={situacao} emergencia={info?.emergencia ?? false} />
                </Popup>
              </Marker>
            )
          })}

        {ponto && (
          <>
            <Marker
              position={[ponto.lat, ponto.lng]}
              icon={PONTO_ICONE}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = (e.target as L.Marker).getLatLng()
                  setPonto({ lat: ll.lat, lng: ll.lng })
                },
              }}
            />
            <Circle
              center={[ponto.lat, ponto.lng]}
              radius={raioKm * 1000}
              pathOptions={{ color: "#1d6fa4", fillColor: "#90caf9", fillOpacity: 0.2, weight: 2, dashArray: "6" }}
            />
          </>
        )}
      </MapContainer>

      <header className="absolute inset-x-0 top-0 z-[1000] flex items-center justify-between gap-3 border-b-4 border-hu-bright bg-hu-panel px-4 py-3 text-hu-text">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="size-8" />
          <span className="font-pixel text-xs text-hu-text sm:text-sm">Hortas Urbanas</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span role="status" aria-live="polite" className="hidden text-xs text-hu-text/80 sm:inline">
            {completo.isPending
              ? "Carregando hortas…"
              : completo.isError
                ? "Erro ao carregar — tente recarregar"
                : `${resumo.total} horta(s)${resumo.dentro > 0 ? ` · ${resumo.dentro} em risco` : ""}${resumo.alerta > 0 ? ` · ${resumo.alerta} em alerta` : ""}`}
          </span>
          {/* Mobile: status compacto sempre visível (carregando/erro/contagem) */}
          <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-hu-text/90 sm:hidden">
            {completo.isPending ? (
              <>
                <span className="hu-spin size-3.5 rounded-full border-2 border-hu-soft border-t-hu-bright" aria-hidden />
                hortas…
              </>
            ) : completo.isError ? (
              "erro — recarregue"
            ) : (
              `${resumo.total} hortas`
            )}
          </span>
          {totalAlertas > 0 && (
            <span className="rounded-lg bg-[#e63946] px-3 py-1 text-xs font-bold">
              ⚠ {totalAlertas} alerta{totalAlertas > 1 ? "s" : ""}
            </span>
          )}
          <Button asChild className="h-9 rounded-lg bg-hu-bright font-bold text-hu-bg hover:bg-hu-bright/90">
            <Link to={logado ? "/painel" : "/"}>{logado ? "Painel" : "Entrar"}</Link>
          </Button>
        </div>
      </header>

      {/* Desktop: busca (cima-esquerda) e legenda (baixo-esquerda) */}
      <div className="absolute left-4 top-20 z-[1000] hidden max-h-[calc(100svh-13rem)] w-72 flex-col gap-3 overflow-auto rounded-2xl border-4 border-hu-bright bg-hu-panel/95 p-4 text-hu-text md:flex">
        <p className="font-pixel text-xs text-hu-text">Buscar por perto</p>
        {controlesBusca}
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] hidden w-56 rounded-2xl border-4 border-hu-bright bg-hu-panel/95 p-4 text-hu-text md:block">
        {legenda}
      </div>

      {/* Mobile: ações no alcance do polegar, abrem folhas inferiores */}
      <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-[1000] flex gap-2 md:hidden">
        <FolhaInferior
          aberta={buscaAberta}
          aoMudar={setBuscaAberta}
          titulo="Buscar por perto"
          gatilho={
            <Button className="h-12 gap-2 rounded-xl bg-hu-bright px-4 font-bold text-hu-bg shadow-lg hover:bg-hu-bright/90">
              <Search className="size-5" aria-hidden /> Buscar
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            {controlesBusca}
            <div className="border-t border-hu-soft pt-3">{legenda}</div>
          </div>
        </FolhaInferior>
        <FolhaInferior
          titulo="Clima"
          gatilho={
            <Button className="h-12 gap-2 rounded-xl border-2 border-hu-bright bg-hu-panel px-4 font-bold text-hu-text shadow-lg hover:bg-black/5">
              <CloudSun className="size-5" aria-hidden /> Clima
            </Button>
          }
        >
          <ConteudoClima />
        </FolhaInferior>
      </div>

      <ClimaWidget />
    </div>
  )
}
