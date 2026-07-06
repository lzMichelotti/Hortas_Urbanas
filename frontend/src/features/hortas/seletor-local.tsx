import "leaflet/dist/leaflet.css"
import { useEffect, useState } from "react"
import type { LeafletMouseEvent } from "leaflet"
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"
import { criarIconePonto } from "@/features/mapa/icone-horta"
import { obterLocalizacao } from "@/features/mapa/gps"
import {
  CENTRO_SANTA_MARIA,
  LIMITES_SANTA_MARIA,
  ZOOM_MAX,
  ZOOM_MIN,
} from "@/features/mapa/cores"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const PONTO = criarIconePonto()
type Local = { lat: number; lng: number }

function parseCoord(s: string, limite: number): number | null {
  const n = Number(s.replace(",", "."))
  if (s.trim() === "" || !Number.isFinite(n) || Math.abs(n) > limite) return null
  return n
}

function Clique({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e: LeafletMouseEvent) => onPick(e.latlng.lat, e.latlng.lng),
  })
  return null
}

function Recentra({ pos }: { pos: Local | null }) {
  const map = useMap()
  useEffect(() => {
    if (pos) map.setView([pos.lat, pos.lng], 15)
  }, [pos, map])
  return null
}

export function SeletorLocal({
  value,
  onChange,
}: {
  value: Local | null
  onChange: (v: Local) => void
}) {
  const [latText, setLatText] = useState("")
  const [lngText, setLngText] = useState("")
  const [gpsErro, setGpsErro] = useState<string | null>(null)

  const [valueAnterior, setValueAnterior] = useState(value)
  if (value !== valueAnterior) {
    setValueAnterior(value)
    if (value === null) {
      setLatText("")
      setLngText("")
    }
  }

  function definirDoMapa(lat: number, lng: number) {
    setLatText(lat.toFixed(6))
    setLngText(lng.toFixed(6))
    onChange({ lat, lng })
  }

  function digitar(latStr: string, lngStr: string) {
    setLatText(latStr)
    setLngText(lngStr)
    const lat = parseCoord(latStr, 90)
    const lng = parseCoord(lngStr, 180)
    if (lat !== null && lng !== null) onChange({ lat, lng })
  }

  function gps() {
    setGpsErro(null)
    obterLocalizacao()
      .then(({ lat, lng }) => definirDoMapa(lat, lng))
      .catch((e: Error) => setGpsErro(e.message))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lat" className="text-xs text-hu-text/80">
            Latitude
          </Label>
          <Input
            id="lat"
            inputMode="decimal"
            placeholder="-29.6842"
            value={latText}
            onChange={(e) => digitar(e.target.value, lngText)}
            className="h-10 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lng" className="text-xs text-hu-text/80">
            Longitude
          </Label>
          <Input
            id="lng"
            inputMode="decimal"
            placeholder="-53.8069"
            value={lngText}
            onChange={(e) => digitar(latText, e.target.value)}
            className="h-10 rounded-lg border-2 border-hu-soft bg-hu-bg text-hu-text placeholder:text-hu-muted"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-hu-muted">Digite as coordenadas ou toque no mapa.</span>
        <Button
          type="button"
          onClick={gps}
          variant="outline"
          className="h-8 shrink-0 rounded-lg border-hu-bright bg-transparent text-xs text-hu-text hover:bg-black/5"
        >
          Minha localização
        </Button>
      </div>

      {gpsErro && (
        <p role="alert" className="rounded-lg bg-[#e63946] px-3 py-2 text-xs font-medium text-white">
          {gpsErro}
        </p>
      )}

      <div className="h-56 overflow-hidden rounded-xl border-2 border-hu-soft">
        <MapContainer
          center={value ?? CENTRO_SANTA_MARIA}
          zoom={13}
          minZoom={ZOOM_MIN}
          maxBounds={LIMITES_SANTA_MARIA}
          maxBoundsViscosity={1}
          className="size-full"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={ZOOM_MAX}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <Clique onPick={definirDoMapa} />
          <Recentra pos={value} />
          {value && <Marker position={[value.lat, value.lng]} icon={PONTO} />}
        </MapContainer>
      </div>
    </div>
  )
}
