import { useCallback, useEffect, useState } from "react"
import { App } from "@capacitor/app"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { lerAlertas, lerNos, lerStatus } from "./api"
import { Coordenador } from "./plugin"

export type EstadoWifi = "procurando" | "com_wifi" | "sem_wifi"

// O nó envia a cada 15 min no campo: 30 s já mostra uma leitura nova logo que chega,
// sem disputar o coordenador (uma requisição por vez) com a sincronização da 10.4.
const INTERVALO_MS = 30_000

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

// Sem resposta, para de repetir: fora da rede da horta não adianta insistir. Volta
// sozinha quando a rede reaparece (redeDisponivel invalida as consultas) ou no "Já conectei".
const opcoesComuns = {
  // A rede da horta não tem Internet: o modo padrão ("online") pausaria a consulta.
  networkMode: "always",
  retry: 1,
  refetchInterval: (q: { state: { status: string } }) => (q.state.status === "error" ? false : INTERVALO_MS),
} as const

export function useStatusCoordenador(ativo: boolean) {
  return useQuery({ queryKey: ["coordenador", "status"], queryFn: lerStatus, enabled: ativo, ...opcoesComuns })
}

export function useNosCoordenador(ativo: boolean) {
  return useQuery({ queryKey: ["coordenador", "nos"], queryFn: lerNos, enabled: ativo, ...opcoesComuns })
}

export function useAlertasCoordenador(ativo: boolean) {
  return useQuery({ queryKey: ["coordenador", "alertas"], queryFn: lerAlertas, enabled: ativo, ...opcoesComuns })
}
