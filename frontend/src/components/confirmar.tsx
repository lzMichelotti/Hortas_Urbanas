import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

// Confirmação inline para ações irreversíveis (excluir, marcar como perdido).
// Inline em vez de modal: mais leve (sem portal/focus-trap) e consistente com o
// padrão já usado em usuarios/hortas. aria-live anuncia a pergunta ao surgir.
export function ConfirmacaoInline({
  pergunta,
  rotuloConfirmar = "Sim, excluir",
  rotuloConfirmando = "Excluindo…",
  confirmando,
  aoConfirmar,
  aoCancelar,
}: {
  pergunta: ReactNode
  rotuloConfirmar?: string
  rotuloConfirmando?: string
  confirmando: boolean
  aoConfirmar: () => void
  aoCancelar: () => void
}) {
  return (
    <div
      role="alert"
      className="mt-3 flex flex-col gap-2 border-t border-red-400/30 pt-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-red-600">{pergunta}</p>
      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          onClick={aoConfirmar}
          disabled={confirmando}
          className="h-11 rounded-lg bg-red-500 font-bold text-white hover:bg-red-500/90"
        >
          {confirmando ? rotuloConfirmando : rotuloConfirmar}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={aoCancelar}
          className="h-11 rounded-lg border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
