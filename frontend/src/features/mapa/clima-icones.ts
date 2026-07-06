interface InfoClima {
  emoji: string
  texto: string
}

// Códigos WMO (Open-Meteo) → emoji + descrição em pt-BR
const POR_CODIGO: Record<number, InfoClima> = {
  0: { emoji: "☀️", texto: "Céu limpo" },
  1: { emoji: "🌤️", texto: "Predom. limpo" },
  2: { emoji: "⛅", texto: "Parc. nublado" },
  3: { emoji: "☁️", texto: "Encoberto" },
  45: { emoji: "🌫️", texto: "Névoa" },
  48: { emoji: "🌫️", texto: "Névoa com geada" },
  51: { emoji: "🌦️", texto: "Garoa leve" },
  53: { emoji: "🌦️", texto: "Garoa" },
  55: { emoji: "🌦️", texto: "Garoa densa" },
  56: { emoji: "🌧️", texto: "Garoa congelante" },
  57: { emoji: "🌧️", texto: "Garoa congelante" },
  61: { emoji: "🌧️", texto: "Chuva fraca" },
  63: { emoji: "🌧️", texto: "Chuva" },
  65: { emoji: "🌧️", texto: "Chuva forte" },
  66: { emoji: "🌧️", texto: "Chuva congelante" },
  67: { emoji: "🌧️", texto: "Chuva congelante" },
  71: { emoji: "🌨️", texto: "Neve fraca" },
  73: { emoji: "🌨️", texto: "Neve" },
  75: { emoji: "🌨️", texto: "Neve forte" },
  77: { emoji: "🌨️", texto: "Grãos de neve" },
  80: { emoji: "🌦️", texto: "Pancadas fracas" },
  81: { emoji: "🌧️", texto: "Pancadas" },
  82: { emoji: "⛈️", texto: "Pancadas fortes" },
  85: { emoji: "🌨️", texto: "Pancadas de neve" },
  86: { emoji: "🌨️", texto: "Pancadas de neve" },
  95: { emoji: "⛈️", texto: "Trovoada" },
  96: { emoji: "⛈️", texto: "Trovoada c/ granizo" },
  99: { emoji: "⛈️", texto: "Trovoada c/ granizo" },
}

const PADRAO: InfoClima = { emoji: "🌡️", texto: "—" }

export function descreverClima(codigo: number): InfoClima {
  return POR_CODIGO[codigo] ?? PADRAO
}
