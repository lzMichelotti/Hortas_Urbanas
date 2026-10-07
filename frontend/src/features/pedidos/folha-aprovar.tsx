import { useState } from "react"
import { Dialog } from "radix-ui"
import { CalendarDays, Check } from "lucide-react"
import { FolhaInferior } from "@/components/ui/folha-inferior"
import { FalaDaGuia, Guia } from "@/components/guia"
import { Aviso } from "@/components/feedback"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ATALHOS_PREVISAO, daquiA, diaMes } from "./previsao"
import { BOTAO_PIXEL } from "./estilos"

const CHIP =
  "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-[#5b3a1a] bg-hu-panel px-2 text-hu-text shadow-[0_3px_0_#5b3a1a] transition-transform active:translate-y-0.5 active:shadow-[0_1px_0_#5b3a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
const CHIP_ATIVO = "translate-y-0.5 bg-hu-bright text-hu-bg shadow-[0_1px_0_#5b3a1a]"

export function FolhaAprovarPedido({
  oQue,
  paraQuem,
  modo = "aprovar",
  previsaoAtual,
  salvando,
  erro,
  aoFechar,
  aoConfirmar,
}: {
  oQue: string
  paraQuem: string
  modo?: "aprovar" | "previsao"
  previsaoAtual?: string | null
  salvando: boolean
  erro?: string
  aoFechar: () => void
  aoConfirmar: (previsao: string | null) => void
}) {
  const atalhos = ATALHOS_PREVISAO.map((a) => ({ ...a, data: daquiA(a.dias) }))
  const [previsao, setPrevisao] = useState<string | null>(previsaoAtual ?? null)
  const [outraData, setOutraData] = useState(
    previsaoAtual != null && !atalhos.some((a) => a.data === previsaoAtual),
  )
  const [semPrevisao, setSemPrevisao] = useState(false)

  function confirmar() {
    if (previsao == null && modo === "aprovar") setSemPrevisao(true)
    else aoConfirmar(previsao)
  }

  return (
    <FolhaInferior aberta aoMudar={(v) => !v && aoFechar()} titulo={modo === "aprovar" ? "Aprovar pedido" : "Mudar previsão"}>
      <p className="mb-4 text-base font-bold">{oQue}</p>
      <FalaDaGuia>Quando deve chegar para {paraQuem}?</FalaDaGuia>

      <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Previsão de entrega">
        {atalhos.map((a) => {
          const ativo = !outraData && previsao === a.data
          return (
            <button
              key={a.dias}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => {
                setOutraData(false)
                setPrevisao(ativo ? null : a.data)
              }}
              className={cn(CHIP, ativo && CHIP_ATIVO)}
            >
              <span className="text-sm font-bold leading-tight">{a.rotulo}</span>
              <span className={cn("text-xs", ativo ? "text-hu-bg/80" : "text-hu-muted")}>{diaMes(a.data)}</span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          setOutraData(true)
          setPrevisao(null)
        }}
        aria-expanded={outraData}
        className={cn(CHIP, "mt-2 min-h-12 w-full flex-row gap-2 text-sm font-bold", outraData && CHIP_ATIVO)}
      >
        <CalendarDays className="size-5" aria-hidden />
        Outra data
      </button>
      {outraData && (
        <Input
          type="date"
          aria-label="Data da previsão"
          min={daquiA(0)}
          value={previsao ?? ""}
          onChange={(e) => setPrevisao(e.target.value || null)}
          className="mt-2 h-12 border-2 border-hu-soft bg-hu-bg text-base text-hu-text"
        />
      )}

      {erro && <Aviso variante="erro" className="mt-4">{erro}</Aviso>}

      <button
        type="button"
        onClick={confirmar}
        disabled={salvando || (modo === "previsao" && previsao == null)}
        className={cn(BOTAO_PIXEL, "mt-5 min-h-14 w-full text-lg")}
      >
        <Check className="size-5" aria-hidden />
        {salvando ? "Salvando…" : modo === "aprovar" ? "Aprovar" : "Salvar previsão"}
      </button>

      {semPrevisao && (
        <AvisoSemPrevisao
          paraQuem={paraQuem}
          aoEscolherData={() => setSemPrevisao(false)}
          aoAprovarMesmoAssim={() => {
            setSemPrevisao(false)
            aoConfirmar(null)
          }}
        />
      )}
    </FolhaInferior>
  )
}

// Mesmo palco da celebração do plantio (fundo escuro, jardineira surgindo), mas pedindo
// uma decisão. Cor fixa no fundo: no tema escuro hu-text é claro e o texto branco sumiria.
function AvisoSemPrevisao({
  paraQuem,
  aoEscolherData,
  aoAprovarMesmoAssim,
}: {
  paraQuem: string
  aoEscolherData: () => void
  aoAprovarMesmoAssim: () => void
}) {
  return (
    <Dialog.Root open onOpenChange={(v) => !v && aoEscolherData()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1300] bg-[#14231a]/95" />
        <Dialog.Content
          aria-describedby="sem-previsao-texto"
          className="fixed inset-0 z-[1300] flex flex-col items-center justify-center gap-4 px-6 text-center outline-none"
        >
          <span aria-hidden className="relative" style={{ animation: "hu-surgir 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
            <Guia className="size-32" />
            <span className="absolute -right-4 top-2 flex size-12 items-center justify-center rounded-xl border-2 border-[#5b3a1a] bg-amber-400 shadow-[0_3px_0_#5b3a1a]">
              <CalendarDays className="size-7 text-[#3b2410]" />
            </span>
          </span>
          <div className="flex flex-col items-center gap-2" style={{ animation: "hu-pop 0.4s ease-out 0.3s both" }}>
            <Dialog.Title className="text-2xl font-bold text-white">Tem certeza?</Dialog.Title>
            <p id="sem-previsao-texto" className="max-w-xs text-lg leading-snug text-white/90">
              <strong className="text-white">{paraQuem}</strong> vai ficar sem saber quando o pedido chega. Uma data
              ajuda a se organizar!
            </p>
          </div>
          <div className="mt-2 flex w-full max-w-xs flex-col gap-3" style={{ animation: "hu-pop 0.4s ease-out 0.45s both" }}>
            <button type="button" onClick={aoEscolherData} className={cn(BOTAO_PIXEL, "min-h-14 w-full text-lg")}>
              <CalendarDays className="size-5" aria-hidden />
              Escolher uma data
            </button>
            <button
              type="button"
              onClick={aoAprovarMesmoAssim}
              className="min-h-12 w-full rounded-xl border-2 border-white/50 text-base font-bold text-white hover:bg-white/10"
            >
              Aprovar sem previsão
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
