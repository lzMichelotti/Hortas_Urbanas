import type { ReactNode } from "react"
import { Clock, Database, HardDrive, Wifi, type LucideIcon } from "lucide-react"
import { Aviso } from "@/components/feedback"
import { FalaDaGuia } from "@/components/guia"
import { Voltar } from "@/components/voltar"
import { Button } from "@/components/ui/button"
import { coordenadorDisponivel } from "@/features/coordenador/disponivel"
import { Chao, PlacaDaHorta } from "@/features/coordenador/placa"
import { useStatusCoordenador, useWifiDaHorta } from "@/features/coordenador/use-coordenador"
import type { StatusCoordenador } from "@/features/coordenador/tipos"
import { cn } from "@/lib/utils"

function veredito(s: StatusCoordenador): string {
  if (s.armazenamento.estado !== "ok") return "A memória dos sensores precisa de atenção."
  if (!s.hora.valida) return "O relógio dos sensores está errado."
  return "Tudo certo com os sensores! 🌱"
}

export function SensoresPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 pb-4">
      <Voltar />
      {coordenadorDisponivel ? (
        <Sensores />
      ) : (
        <Aviso variante="info">Os sensores da horta só funcionam no aplicativo do celular.</Aviso>
      )}
    </div>
  )
}

function Sensores() {
  const { wifi, procurarDeNovo, abrirWifi } = useWifiDaHorta()
  const status = useStatusCoordenador(wifi === "com_wifi")

  // Perdeu o contato: volta para a placa em vez de mostrar números velhos com um alerta.
  if (status.data && !status.isError) return <Painel s={status.data} />

  const procurando = wifi === "procurando" || (wifi === "com_wifi" && !status.isError)
  if (procurando) {
    return (
      <div role="status" aria-live="polite" className="mt-6">
        <PlacaDaHorta>
          <Wifi className="size-14 animate-pulse" aria-hidden />
          <p className="text-lg font-bold leading-snug">Procurando os sensores…</p>
        </PlacaDaHorta>
        <Chao />
      </div>
    )
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div>
        <PlacaDaHorta>
          <Wifi className="size-14" aria-hidden />
          <p className="text-lg font-bold leading-snug">Conecte no Wi-Fi da horta</p>
        </PlacaDaHorta>
        <Chao />
      </div>
      <Button
        onClick={() => void abrirWifi()}
        className="h-14 gap-3 rounded-xl bg-hu-bright text-lg font-bold text-hu-bg hover:bg-hu-bright/90"
      >
        <Wifi className="size-6" aria-hidden />
        Conectar
      </Button>
      <button
        type="button"
        onClick={() => void (wifi === "sem_wifi" ? procurarDeNovo() : status.refetch())}
        className="-mt-2 self-center rounded-lg p-2 text-base font-medium text-hu-bright hover:bg-black/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hu-bright/50"
      >
        Já conectei
      </button>
    </div>
  )
}

function Painel({ s }: { s: StatusCoordenador }) {
  const usado = s.armazenamento.total_kb > 0 ? Math.round((s.armazenamento.usado_kb / s.armazenamento.total_kb) * 100) : 0
  const memoriaOk = s.armazenamento.estado === "ok"
  return (
    <>
      <FalaDaGuia humor={memoriaOk && s.hora.valida ? "feliz" : "neutra"}>{veredito(s)}</FalaDaGuia>
      <div className="grid grid-cols-3 gap-3">
        <Bloco icone={Clock} ok={s.hora.valida} rotulo="relógio">
          {s.hora.valida ? "Certo" : "Errado"}
        </Bloco>
        <Bloco icone={HardDrive} ok={memoriaOk} rotulo="memória">
          {usado}%
          <span aria-hidden className="mt-2 block h-2 w-full overflow-hidden rounded-full bg-hu-soft/50">
            <span
              className={cn("block h-full rounded-full", memoriaOk ? "bg-hu-bright" : "bg-amber-500")}
              style={{ width: `${usado}%` }}
            />
          </span>
        </Bloco>
        <Bloco icone={Database} ok rotulo="leituras">
          {s.armazenamento.registros.toLocaleString("pt-BR")}
        </Bloco>
      </div>
    </>
  )
}

function Bloco({
  icone: Icone,
  ok,
  rotulo,
  children,
}: {
  icone: LucideIcon
  ok: boolean
  rotulo: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border-2 bg-hu-panel px-2 py-4 text-center",
        ok ? "border-hu-soft" : "border-amber-500",
      )}
    >
      <Icone className={cn("size-10", ok ? "text-hu-bright" : "text-amber-500")} aria-hidden />
      <span
        className={cn(
          "w-full text-xl font-bold leading-none",
          ok ? "text-hu-text" : "text-amber-600 dark:text-amber-400",
        )}
      >
        {children}
      </span>
      <span className="text-sm text-hu-muted">{rotulo}</span>
    </div>
  )
}
