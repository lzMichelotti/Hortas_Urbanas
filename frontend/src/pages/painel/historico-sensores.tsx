import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Copy, Droplets, Sprout, Thermometer } from "lucide-react"
import { Carregando, EstadoVazio } from "@/components/feedback"
import { Voltar } from "@/components/voltar"
import { Cartao } from "@/features/admin/blocos"
import { Grafico } from "@/features/coordenador/grafico"
import {
  contarSemHora,
  leiturasDoPeriodo,
  mediaPorIntervalo,
  nosGuardados,
  totalGuardadas,
} from "@/features/coordenador/historico"
import { medicoesEmCsv } from "@/features/coordenador/medicoes"
import type { LeituraGuardada } from "@/features/coordenador/sincronizacao"
import { cn, plural } from "@/lib/utils"

const HORA = 3_600_000
const PERIODOS = [
  { rotulo: "24 horas", duracao: 24 * HORA, intervalo: HORA },
  { rotulo: "7 dias", duracao: 7 * 24 * HORA, intervalo: 3 * HORA },
  { rotulo: "30 dias", duracao: 30 * 24 * HORA, intervalo: 24 * HORA },
]

const DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" })
const grau = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} °C`
const pct = (v: number) => `${Math.round(v)}%`

const ok = (l: LeituraGuardada, campo: keyof LeituraGuardada["estados"], v: number | null) =>
  l.estados[campo] === "ok" ? v : null

// Só lê o IndexedDB: funciona sem conexão nenhuma (networkMode "always").
const local = { networkMode: "always" as const, staleTime: 0 }

export function HistoricoSensoresPage() {
  const nos = useQuery({ queryKey: ["historico", "nos"], queryFn: nosGuardados, ...local })
  const total = useQuery({ queryKey: ["historico", "total"], queryFn: totalGuardadas, ...local })
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState(1)

  const mac = escolhido ?? nos.data?.[0]?.mac ?? null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-4">
      <Voltar to="/painel/sensores" />
      <h1 className="text-xl font-bold text-hu-text">Histórico dos sensores</h1>

      {nos.isPending ? (
        <Carregando />
      ) : !mac ? (
        <EstadoVazio ilustracao="/personagem-idoso.webp">
          Ainda não há dados guardados. Abra os Sensores no Wi-Fi da horta para guardar.
        </EstadoVazio>
      ) : (
        <>
          {nos.data && nos.data.length > 1 && (
            <Escolha
              opcoes={nos.data.map((n) => ({ chave: n.mac, rotulo: n.nome }))}
              atual={mac}
              aoEscolher={setEscolhido}
            />
          )}
          <Escolha
            opcoes={PERIODOS.map((p, i) => ({ chave: String(i), rotulo: p.rotulo }))}
            atual={String(periodo)}
            aoEscolher={(c) => setPeriodo(Number(c))}
          />
          <Graficos mac={mac} periodo={periodo} />
          {total.data != null && (
            <p className="text-sm text-hu-muted">
              Guardadas no celular: {plural(total.data, "leitura", "leituras")}.
            </p>
          )}
          <CopiarTempos />
        </>
      )}
    </div>
  )
}

function Graficos({ mac, periodo }: { mac: string; periodo: number }) {
  const p = PERIODOS[periodo]
  // Fixado ao montar/trocar a escolha: o gráfico não "anda" sozinho entre renderizações.
  const [ate] = useState(() => Date.now())
  const desde = ate - p.duracao
  const leituras = useQuery({
    queryKey: ["historico", "leituras", mac, periodo],
    queryFn: () => leiturasDoPeriodo(mac, desde, ate),
    ...local,
  })
  const semHora = useQuery({ queryKey: ["historico", "sem-hora", mac], queryFn: () => contarSemHora(mac), ...local })

  if (!leituras.data) return <Carregando />
  const series = [
    { titulo: "Temperatura do ar", icone: Thermometer, formatar: grau, valor: (l: LeituraGuardada) => ok(l, "temperatura", l.temperatura_c) },
    { titulo: "Umidade do ar", icone: Droplets, formatar: pct, valor: (l: LeituraGuardada) => ok(l, "umidade_ar", l.umidade_ar_pct) },
    { titulo: "Umidade do solo", icone: Sprout, formatar: pct, valor: (l: LeituraGuardada) => ok(l, "solo", l.solo_pct) },
  ]

  return (
    <>
      <p className="text-sm text-hu-muted">
        De {DATA.format(desde)} a {DATA.format(ate)} · média a cada{" "}
        {p.intervalo >= 24 * HORA ? "dia" : p.intervalo > HORA ? `${p.intervalo / HORA} horas` : "hora"}
      </p>
      {series.map((s) => (
        <Cartao key={s.titulo} titulo={s.titulo} icone={s.icone}>
          <Grafico
            pontos={mediaPorIntervalo(leituras.data, s.valor, p.intervalo)}
            desde={desde}
            ate={ate}
            intervaloMs={p.intervalo}
            formatar={s.formatar}
          />
        </Cartao>
      ))}
      {semHora.data ? (
        <p className="text-sm text-hu-muted">
          {plural(semHora.data, "leitura está", "leituras estão")} com hora desconhecida e não aparece
          {semHora.data === 1 ? "" : "m"} nos gráficos.
        </p>
      ) : null}
    </>
  )
}

function Escolha({
  opcoes,
  atual,
  aoEscolher,
}: {
  opcoes: { chave: string; rotulo: string }[]
  atual: string
  aoEscolher: (chave: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <button
          key={o.chave}
          type="button"
          onClick={() => aoEscolher(o.chave)}
          aria-pressed={o.chave === atual}
          className={cn(
            "h-11 rounded-full border-2 px-4 text-base font-bold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hu-bright/50",
            o.chave === atual
              ? "border-hu-bright bg-hu-bright text-hu-bg"
              : "border-hu-soft bg-hu-panel text-hu-text hover:bg-black/5",
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

// Para a análise do TCC (10.6): copia os tempos das requisições como CSV.
function CopiarTempos() {
  const [copiado, setCopiado] = useState<"sim" | "erro" | null>(null)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(await medicoesEmCsv())
      setCopiado("sim")
    } catch {
      setCopiado("erro")
    }
  }
  return (
    <button
      type="button"
      onClick={() => void copiar()}
      className="mt-2 inline-flex items-center gap-2 self-start rounded-lg p-2 text-sm font-medium text-hu-muted hover:bg-black/5"
    >
      <Copy className="size-4" aria-hidden />
      {copiado === "sim" ? "Tempos copiados" : copiado === "erro" ? "Não deu para copiar" : "Copiar tempos das conexões (CSV)"}
    </button>
  )
}
