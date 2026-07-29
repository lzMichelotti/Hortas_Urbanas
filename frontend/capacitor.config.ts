import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "br.com.hortasurbanas.app",
  appName: "Hortas Urbanas",
  webDir: "dist",
  server: {
    url: "https://app.hortasurbanassm.com.br",
    // Servida do APK quando a WebView nem consegue carregar o site.
    errorPath: "erro.html",
  },
}

export default config
