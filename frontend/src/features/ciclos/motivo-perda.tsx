import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MOTIVOS_CLIMA, MOTIVOS_OUTROS, type Motivo } from "@/features/ciclos/motivos"

const OPCAO =
  "flex min-h-14 items-center rounded-xl border-2 border-hu-soft bg-transparent px-3 py-2 text-left text-sm font-bold text-hu-text hover:bg-black/5 active:bg-black/10 disabled:pointer-events-none disabled:opacity-50"

// Escolher o motivo já confirma a perda — evita um toque a mais só pra dizer "sim".
export function EscolherMotivoPerda({
  pergunta,
  salvando,
  aoEscolher,
  aoCancelar,
}: {
  pergunta: ReactNode
  salvando: boolean
  aoEscolher: (motivo: Motivo, observacao?: string) => void
  aoCancelar: () => void
}) {
  const [observacao, setObservacao] = useState("")
  const [pedindoObservacao, setPedindoObservacao] = useState(false)

  return (
    <div role="group" className="mt-3 border-t border-red-400/30 pt-3">
      <p className="text-sm text-red-600">{pergunta}</p>

      {pedindoObservacao ? (
        <div className="mt-3">
          <label htmlFor="obs-perda" className="text-sm text-hu-muted">
            Quer contar o que houve? (opcional)
          </label>
          <Input
            id="obs-perda"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            maxLength={140}
            autoFocus
            className="mt-1 h-12"
          />
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => aoEscolher("OUTRO", observacao.trim() || undefined)}
              disabled={salvando}
              className="h-12 flex-1 rounded-xl bg-red-500 font-bold text-white hover:bg-red-500/90"
            >
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPedindoObservacao(false)}
              disabled={salvando}
              className="h-12 rounded-xl border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
            >
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 font-pixel text-[10px] text-hu-muted">Foi o tempo?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {MOTIVOS_CLIMA.map((o) => (
              <button
                key={o.motivo}
                type="button"
                onClick={() => aoEscolher(o.motivo)}
                disabled={salvando}
                className={OPCAO}
              >
                {o.rotulo}
              </button>
            ))}
          </div>

          <p className="mt-3 font-pixel text-[10px] text-hu-muted">Foi outra coisa?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {MOTIVOS_OUTROS.map((o) => (
              <button
                key={o.motivo}
                type="button"
                onClick={() => (o.motivo === "OUTRO" ? setPedindoObservacao(true) : aoEscolher(o.motivo))}
                disabled={salvando}
                className={OPCAO}
              >
                {o.rotulo}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={aoCancelar}
            disabled={salvando}
            className="mt-3 h-12 w-full rounded-xl border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
          >
            Cancelar
          </Button>
        </>
      )}
    </div>
  )
}
