import { useEffect, useState } from "react"
import { App as AppNativo } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"

// Serve pro suporte: sem isso não há como saber qual APK a pessoa tem no celular.
export function VersaoApp() {
  const [versao, setVersao] = useState<string | null>(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let ativo = true
    AppNativo.getInfo()
      .then((info) => {
        if (ativo) setVersao(`${info.version} (${info.build})`)
      })
      .catch(() => null)

    return () => {
      ativo = false
    }
  }, [])

  if (!versao) return null

  return <p className="text-center text-xs text-hu-muted">Versão {versao}</p>
}
