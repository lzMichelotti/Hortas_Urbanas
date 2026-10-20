import { BellRing } from "lucide-react"
import { Aviso, EstadoVazio } from "@/components/feedback"
import { Voltar } from "@/components/voltar"
import { coordenadorDisponivel } from "@/features/coordenador/disponivel"
import { PlacaConectar, PlacaProcurando } from "@/features/coordenador/placa"
import type { Alerta, NoCoordenador } from "@/features/coordenador/tipos"
import { useAlertasCoordenador, useNosCoordenador, useWifiDaHorta } from "@/features/coordenador/use-coordenador"

// As regras dos alertas são da Etapa 9; até lá a rota responde sempre vazia.
const TITULO: Record<string, string> = {
  bateria_baixa: "Bateria fraca",
}

export function AvisosSensoresPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 pb-4">
      <Voltar to="/painel/sensores" />
      {coordenadorDisponivel ? (
        <Avisos />
      ) : (
        <Aviso variante="info">Os sensores da horta só funcionam no aplicativo do celular.</Aviso>
      )}
    </div>
  )
}

function Avisos() {
  const { wifi, procurarDeNovo, abrirWifi } = useWifiDaHorta()
  const naRede = wifi === "com_wifi"
  const alertas = useAlertasCoordenador(naRede)
  const nos = useNosCoordenador(naRede)

  if (alertas.data && !alertas.isError) {
    if (alertas.data.length === 0) {
      return (
        <EstadoVazio ilustracao="/personagem-cachorro.webp">
          Nenhum aviso por enquanto. A horta está tranquila! 🐾
        </EstadoVazio>
      )
    }
    return (
      <ul className="flex flex-col gap-3">
        {alertas.data.map((a, i) => (
          <ItemAlerta key={`${a.tipo}-${a.mac ?? ""}-${i}`} alerta={a} nos={nos.data} />
        ))}
      </ul>
    )
  }

  if (wifi === "procurando" || (naRede && !alertas.isError)) return <PlacaProcurando />

  return (
    <PlacaConectar
      aoConectar={() => void abrirWifi()}
      aoJaConectei={() => void (wifi === "sem_wifi" ? procurarDeNovo() : alertas.refetch())}
    />
  )
}

function ItemAlerta({ alerta, nos }: { alerta: Alerta; nos: NoCoordenador[] | undefined }) {
  const no = nos?.find((n) => n.mac === alerta.mac)
  return (
    <li className="flex items-center gap-3 rounded-2xl border-2 border-amber-500 bg-hu-panel p-4 text-hu-text">
      <BellRing className="size-8 shrink-0 text-amber-500" aria-hidden />
      <div className="flex flex-col">
        <span className="text-base font-bold">{TITULO[alerta.tipo] ?? "Atenção nos sensores"}</span>
        {no && <span className="text-sm text-hu-muted">{no.cadastrado ? no.nome : "Sensor sem nome"}</span>}
      </div>
    </li>
  )
}
