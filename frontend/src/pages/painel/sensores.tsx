import type { ReactNode } from "react"
import { Bell, Clock, Database, HardDrive, History, type LucideIcon } from "lucide-react"
import { Aviso } from "@/components/feedback"
import { FalaDaGuia } from "@/components/guia"
import { Voltar } from "@/components/voltar"
import { Atalho } from "@/features/admin/blocos"
import { CartaoNo } from "@/features/coordenador/cartao-no"
import { CartaoSincronia, ROTA_HISTORICO } from "@/features/coordenador/cartao-sincronia"
import { estaParado } from "@/features/coordenador/classificacao"
import { coordenadorDisponivel } from "@/features/coordenador/disponivel"
import { PlacaConectar, PlacaProcurando } from "@/features/coordenador/placa"
import { IndicadorPuxar } from "@/features/coordenador/puxar"
import { usePuxarParaAtualizar } from "@/features/coordenador/use-puxar"
import type { NoCoordenador, StatusCoordenador } from "@/features/coordenador/tipos"
import { useNosCoordenador, useStatusCoordenador, useWifiDaHorta } from "@/features/coordenador/use-coordenador"
import { useSincronia } from "@/features/coordenador/use-sincronia"
import { cn, plural } from "@/lib/utils"

function veredito(nos: NoCoordenador[], s: StatusCoordenador | undefined): string {
  if (nos.length === 0) return "Nenhum sensor mandou leitura ainda."
  const parados = nos.filter(estaParado).length
  if (parados > 0) return `${plural(parados, "sensor está parado", "sensores estão parados")}.`
  const comProblema = nos.some((n) => {
    const e = n.ultima_leitura?.estados
    return e != null && (e.temperatura !== "ok" || e.umidade_ar !== "ok" || e.solo !== "ok")
  })
  if (comProblema) return "Um sensor precisa de atenção."
  if (s && !s.hora.valida) return "Os sensores estão bem, mas o relógio da central está errado."
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
  const naRede = wifi === "com_wifi"
  const nos = useNosCoordenador(naRede)
  const status = useStatusCoordenador(naRede)
  // Sem Wi-Fi a consulta fica desligada e guarda os dados velhos: não contam como contato.
  const emContato = naRede && Boolean(nos.data) && !nos.isError
  const { estado, sincronizarAgora } = useSincronia(emContato ? nos.dataUpdatedAt : 0)
  const { gestos, puxada, atualizando } = usePuxarParaAtualizar(() =>
    Promise.all([nos.refetch(), status.refetch(), sincronizarAgora()]),
  )

  // Perdeu o contato: volta para a placa em vez de mostrar números velhos com um alerta.
  if (nos.data && emContato) {
    return (
      <div {...gestos} className="flex flex-col gap-4">
        <IndicadorPuxar puxada={puxada} atualizando={atualizando} />
        <FalaDaGuia>{veredito(nos.data, status.data)}</FalaDaGuia>
        <CartaoSincronia estado={estado} />
        {nos.data.map((no) => (
          <CartaoNo key={no.mac} no={no} />
        ))}
        <Atalho para="/painel/sensores/avisos" icone={Bell}>
          Avisos dos sensores
        </Atalho>
        {status.data && <Central s={status.data} />}
      </div>
    )
  }

  if (wifi === "procurando" || (naRede && !nos.isError)) return <PlacaProcurando />

  return (
    <>
      <PlacaConectar
        aoConectar={() => void abrirWifi()}
        aoJaConectei={() => void (wifi === "sem_wifi" ? procurarDeNovo() : nos.refetch())}
      />
      {/* O histórico guardado não depende de conexão nenhuma. */}
      <Atalho para={ROTA_HISTORICO} icone={History}>
        Ver o histórico guardado no celular
      </Atalho>
    </>
  )
}

function Central({ s }: { s: StatusCoordenador }) {
  const usado = s.armazenamento.total_kb > 0 ? Math.round((s.armazenamento.usado_kb / s.armazenamento.total_kb) * 100) : 0
  const memoriaOk = s.armazenamento.estado === "ok"
  return (
    <section className="mt-2 flex flex-col gap-3">
      <h2 className="text-base font-bold text-hu-text">Central da horta</h2>
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
    </section>
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
