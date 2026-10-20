import { Thermometer, Wifi } from "lucide-react"
import { Cartao, Fala, Numero } from "@/features/admin/blocos"
import { Aviso, Carregando } from "@/components/feedback"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import { coordenadorDisponivel } from "@/features/coordenador/disponivel"
import { useStatusCoordenador, useWifiDaHorta } from "@/features/coordenador/use-coordenador"
import type { StatusCoordenador } from "@/features/coordenador/tipos"

const MEMORIA: Record<StatusCoordenador["armazenamento"]["estado"], string> = {
  ok: "tudo certo",
  espaco_baixo: "quase cheia",
  formatado_no_boot: "foi apagada e recomeçou",
  falhas_de_gravacao: "com problema para guardar",
  nao_montado: "com defeito",
}

function veredito(s: StatusCoordenador): string {
  if (s.armazenamento.estado !== "ok") return "Os sensores estão ligados, mas a memória deles precisa de atenção."
  if (!s.hora.valida) return "Os sensores estão ligados, mas o relógio deles precisa ser acertado."
  return "Os sensores da horta estão funcionando! 🌱"
}

export function SensoresPage() {
  if (!coordenadorDisponivel) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-4">
        <Voltar />
        <Aviso variante="info">Os sensores da horta só funcionam no aplicativo do celular.</Aviso>
      </div>
    )
  }
  return <Sensores />
}

function Sensores() {
  const { wifi, procurarDeNovo, abrirWifi } = useWifiDaHorta()
  const status = useStatusCoordenador(wifi === "com_wifi")

  const semContato = wifi === "sem_wifi" || (status.isError && !status.data)
  const mensagem = wifi === "sem_wifi" ? "Conecte-se ao Wi-Fi da horta." : status.error?.message

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-4">
      <Voltar />

      {semContato ? (
        <>
          <Aviso variante="info">{mensagem}</Aviso>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => void abrirWifi()}
              className="h-12 gap-2 rounded-xl bg-hu-bright px-4 text-base font-bold text-hu-bg hover:bg-hu-bright/90"
            >
              <Wifi className="size-5" aria-hidden />
              Abrir o Wi-Fi
            </Button>
            <Button
              variant="outline"
              onClick={() => void (wifi === "sem_wifi" ? procurarDeNovo() : status.refetch())}
              className="h-12 rounded-xl border-2 border-hu-bright bg-transparent px-4 text-base font-bold text-hu-text hover:bg-black/5"
            >
              Tentar de novo
            </Button>
          </div>
        </>
      ) : !status.data ? (
        <Carregando texto="Procurando os sensores da horta…" />
      ) : (
        <Painel s={status.data} perdeuContato={status.isError} />
      )}
    </div>
  )
}

function Painel({ s, perdeuContato }: { s: StatusCoordenador; perdeuContato: boolean }) {
  const usado = s.armazenamento.total_kb > 0 ? Math.round((s.armazenamento.usado_kb / s.armazenamento.total_kb) * 100) : 0
  return (
    <>
      <Fala>{veredito(s)}</Fala>
      {perdeuContato && (
        <Aviso variante="erro">Perdemos o contato com os sensores. Confira se você está no Wi-Fi da horta.</Aviso>
      )}
      <Cartao titulo="Sensores da horta" icone={Thermometer}>
        <div className="grid grid-cols-3 gap-3">
          <Numero valor={s.armazenamento.registros.toLocaleString("pt-BR")} rotulo="leituras guardadas" />
          <Numero valor={`${usado}%`} rotulo="da memória usada" atencao={s.armazenamento.estado !== "ok"} />
          <Numero valor={s.hora.valida ? "Certo" : "Errado"} rotulo="relógio" atencao={!s.hora.valida} />
        </div>
        <p className="mt-3 border-t border-hu-soft/40 pt-3 text-sm text-hu-muted">
          Memória: <span className="font-bold text-hu-text">{MEMORIA[s.armazenamento.estado]}</span>
        </p>
      </Cartao>
    </>
  )
}
