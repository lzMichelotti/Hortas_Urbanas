import { lazy } from "react"

const TENTATIVAS = 3
const ESPERA_MS = 600

export const lazyComRetry: typeof lazy = (factory) =>
  lazy(async () => {
    let ultimoErro: unknown
    for (let i = 0; i < TENTATIVAS; i++) {
      try {
        return await factory()
      } catch (e) {
        ultimoErro = e
        await new Promise((r) => setTimeout(r, ESPERA_MS * (i + 1)))
      }
    }
    throw ultimoErro
  })
