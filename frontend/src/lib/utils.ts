import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** Endereço numa linha; aceita qualquer objeto com os campos de local (horta, ponto do mapa). */
export function endereco(p: {
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
}): string {
  return [p.rua, p.numero, p.bairro, p.cidade, p.uf].filter(Boolean).join(", ")
}
