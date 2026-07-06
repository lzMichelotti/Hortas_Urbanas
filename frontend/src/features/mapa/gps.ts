export type Coordenada = { lat: number; lng: number }

const MENSAGENS: Record<number, string> = {
  1: "Permissão de localização negada. Toque no mapa para marcar o ponto.",
  2: "Não foi possível obter sua localização agora.",
  3: "A localização demorou demais. Tente de novo.",
}

export function obterLocalizacao(): Promise<Coordenada> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Seu navegador não oferece localização. Toque no mapa para marcar o ponto."))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(MENSAGENS[err.code] ?? "Não foi possível obter sua localização.")),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    )
  })
}
