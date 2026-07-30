import createClient, { type Middleware } from "openapi-fetch"
import type { paths } from "@/lib/api/schema"
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  avisarSessaoExpirada,
} from "@/lib/auth/session"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

export const api = createClient<paths>({ baseUrl: API_BASE_URL })

const ROTAS_PUBLICAS = ["/token", "/token/refresh"]
const TIMEOUT_MS = 15_000

function isPublica(url: string): boolean {
  return ROTAS_PUBLICAS.includes(new URL(url).pathname)
}

const retryClone = new WeakMap<Request, Request>()
let refreshing: Promise<boolean> | null = null

async function renovarTokens(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false
  const resp = await fetch(`${API_BASE_URL}/token/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!resp.ok) {
    clearTokens()
    return false
  }
  if (getRefreshToken() !== refresh) return false
  const dados = (await resp.json()) as {
    access_token: string
    refresh_token: string
  }
  setTokens(dados.access_token, dados.refresh_token)
  return true
}

const authMiddleware: Middleware = {
  onRequest({ request }) {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(TIMEOUT_MS)])
    const req = new Request(request, { signal })
    if (isPublica(req.url)) return req
    const token = getAccessToken()
    if (token) req.headers.set("Authorization", `Bearer ${token}`)
    retryClone.set(req, req.clone())
    return req
  },
  async onResponse({ request, response }) {
    if (response.status !== 401 || isPublica(request.url)) return response
    refreshing ??= renovarTokens().finally(() => {
      refreshing = null
    })
    const renovou = await refreshing
    if (!renovou) {
      clearTokens()
      if (request.headers.has("Authorization")) avisarSessaoExpirada()
      return response
    }
    const retry = retryClone.get(request) ?? request
    retry.headers.set("Authorization", `Bearer ${getAccessToken()}`)
    return fetch(retry)
  },
}

api.use(authMiddleware)
