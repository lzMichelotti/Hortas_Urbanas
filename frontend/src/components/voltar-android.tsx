import { useEffect, useState } from "react"
import { App as AppNativo } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"

const ESPERA_SAIR = 2500

// Sem um listener de `backButton`, o Capacitor fecha a activity no primeiro toque
// e o app inteiro some. Aqui o voltar fecha o que estiver aberto, depois anda pra
// trás na navegação, e só sai do app com dois toques seguidos na tela inicial.
export function VoltarAndroid() {
  const [avisandoSaida, setAvisandoSaida] = useState(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let ultimoToque = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const aoVoltar = ({ canGoBack }: { canGoBack: boolean }) => {
      // Radix (folhas, diálogos, menus) escuta Escape no document e dá
      // preventDefault ao fechar a camada do topo — se consumiram, acabou aqui.
      const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
      if (!document.dispatchEvent(escape)) return

      if (canGoBack) {
        window.history.back()
        return
      }

      const agora = Date.now()
      if (agora - ultimoToque < ESPERA_SAIR) {
        void AppNativo.exitApp()
        return
      }

      ultimoToque = agora
      setAvisandoSaida(true)
      clearTimeout(timer)
      timer = setTimeout(() => setAvisandoSaida(false), ESPERA_SAIR)
    }

    // O .catch cobre o APK antigo, sem o plugin nativo: lá o registro falha e o
    // sistema segue com o comportamento padrão, sem quebrar o app.
    const listener = AppNativo.addListener("backButton", aoVoltar).catch(() => null)

    return () => {
      clearTimeout(timer)
      void listener.then((h) => h?.remove())
    }
  }, [])

  if (!avisandoSaida) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[2000] flex justify-center px-4">
      <p
        role="status"
        className="rounded-xl border-2 border-hu-bright bg-hu-panel px-4 py-2 text-center text-sm font-medium text-hu-text shadow-lg"
      >
        Toque em voltar de novo para fechar o aplicativo.
      </p>
    </div>
  )
}
