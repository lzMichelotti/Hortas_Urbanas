import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { sincronizar, type Progresso } from "./sincronizacao"

export type EstadoSincronia =
  | { fase: "parada" }
  | { fase: "guardando"; progresso: Progresso }
  | { fase: "pronta"; novas: number }
  | { fase: "interrompida" }

// Já em dia, só busca o novo de tempos em tempos: o nó de campo envia a cada 15 min.
const REPETIR_APOS_MS = 5 * 60_000

// Só com o app aberto e na rede da horta (decisão da 10.4). "contatoEm" é a hora da
// última resposta do coordenador: a cada contato novo, retoma uma cópia que parou
// no meio ou, se já estava em dia, busca o novo depois de REPETIR_APOS_MS.
export function useSincronia(contatoEm: number) {
  const [estado, setEstado] = useState<EstadoSincronia>({ fase: "parada" })
  const fase = useRef<EstadoSincronia["fase"]>("parada")
  const terminouEm = useRef(0)
  const qc = useQueryClient()

  const sincronizarAgora = useCallback(() => {
    const mudar = (e: EstadoSincronia) => {
      fase.current = e.fase
      setEstado(e)
    }
    return sincronizar((progresso) => mudar({ fase: "guardando", progresso })).then(
      (novas) => {
        terminouEm.current = Date.now()
        mudar({ fase: "pronta", novas })
        void qc.invalidateQueries({ queryKey: ["historico"] })
      },
      () => mudar({ fase: "interrompida" }),
    )
  }, [qc])

  useEffect(() => {
    if (!contatoEm || fase.current === "guardando") return
    if (fase.current === "pronta" && Date.now() - terminouEm.current < REPETIR_APOS_MS) return
    void sincronizarAgora()
  }, [contatoEm, sincronizarAgora])

  return { estado, sincronizarAgora }
}
