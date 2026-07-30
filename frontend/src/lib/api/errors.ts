const MSG_SEM_CONEXAO = "Sem conexão com o servidor. Verifique sua internet e tente novamente."

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown
  constructor(status: number, body: unknown) {
    super(status === 0 ? MSG_SEM_CONEXAO : mensagemDeErro(body))
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

export async function unwrap<T>(
  promise: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let resultado
  try {
    resultado = await promise
  } catch (e) {
    throw new ApiError(0, e)
  }
  const { data, error, response } = resultado
  if (error !== undefined || !response.ok) {
    throw new ApiError(response.status, error)
  }
  return data as T
}

// Erros de validação do FastAPI/Pydantic (422) vêm em inglês e técnicos.
// Traduzimos pelo "type"; nossos próprios validadores já mandam português (value_error).
const VALIDACAO_PT: Record<string, string> = {
  missing: "Faltou preencher um campo.",
  string_too_short: "Faltou preencher um campo.",
  string_too_long: "O texto ficou muito longo. Tente encurtar.",
}
const VALIDACAO_PADRAO = "Confira o que foi preenchido e tente de novo."

function mensagemDeErro(error: unknown): string {
  if (error && typeof error === "object" && "detail" in error) {
    const detail = (error as { detail: unknown }).detail
    if (typeof detail === "string") return detail
    if (Array.isArray(detail)) {
      const msgs = detail.map((d) => {
        if (!d || typeof d !== "object") return VALIDACAO_PADRAO
        const tipo = "type" in d ? String((d as { type: unknown }).type) : ""
        const msg = "msg" in d ? String((d as { msg: unknown }).msg) : ""
        if (tipo === "value_error" && msg) return msg.replace(/^Value error,\s*/i, "")
        return VALIDACAO_PT[tipo] ?? VALIDACAO_PADRAO
      })
      const unicas = [...new Set(msgs.filter(Boolean))]
      if (unicas.length > 0) return unicas.join(" · ")
    }
  }
  if (error instanceof Error && error.message) return error.message
  return "Algo deu errado. Tente novamente."
}
