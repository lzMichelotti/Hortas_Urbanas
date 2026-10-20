import { useCallback, useEffect, useState } from "react"
import { App } from "@capacitor/app"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { lerStatus } from "./api"
import { Coordenador } from "./plugin"

export type EstadoWifi = "procurando" | "com_wifi" | "sem_wifi"

const INTERVALO_STATUS_MS = 15_000

function pedirRede(setWifi: (e: EstadoWifi) => void) {
  return Coordenador.conectar().then(
    () => setWifi("com_wifi"),
    () => setWifi("sem_wifi"),
  )
}

// "com_wifi" só diz que há um Wi-Fi; se é o da horta, quem confirma é o /status.
export function useWifiDaHorta() {
  const [wifi, setWifi] = useState<EstadoWifi>("procurando")
  const qc = useQueryClient()

  const procurar = useCallback(() => {
    setWifi("procurando")
    return pedirRede(setWifi)
  }, [])

  useEffect(() => {
    void pedirRede(setWifi)
    const ouvintes = [
      Coordenador.addListener("redeDisponivel", () => {
        setWifi("com_wifi")
        void qc.invalidateQueries({ queryKey: ["coordenador"] })
      }),
      Coordenador.addListener("redePerdida", () => setWifi("sem_wifi")),
    ]
    return () => {
      for (const o of ouvintes) void o.then((h) => h.remove())
      void Coordenador.desconectar()
    }
  }, [qc])

  // O pedido de rede expira se nenhum Wi-Fi aparecer; ao voltar do painel do Wi-Fi, procura de novo.
  useEffect(() => {
    if (wifi !== "sem_wifi") return
    const ouvinte = App.addListener("resume", () => void procurar())
    return () => void ouvinte.then((h) => h.remove())
  }, [wifi, procurar])

  return {
    wifi,
    procurarDeNovo: procurar,
    abrirWifi: () => Coordenador.abrirConfiguracoesWifi(),
  }
}

export function useStatusCoordenador(ativo: boolean) {
  return useQuery({
    queryKey: ["coordenador", "status"],
    queryFn: lerStatus,
    enabled: ativo,
    // A rede da horta não tem Internet: o modo padrão ("online") pausaria a consulta.
    networkMode: "always",
    retry: 1,
    refetchInterval: INTERVALO_STATUS_MS,
  })
}
