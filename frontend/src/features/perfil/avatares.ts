export const AVATARES = [
  { chave: "jardineira", rotulo: "Jardineira", src: "/avatar-jardineira.webp" },
  { chave: "cachorro", rotulo: "Com o cão", src: "/avatar-cachorro.webp" },
  { chave: "crianca", rotulo: "Criança", src: "/avatar-crianca.webp" },
  { chave: "idoso", rotulo: "Pessoa idosa", src: "/avatar-idoso.webp" },
] as const

export const AVATAR_PADRAO = "jardineira"

export function srcAvatar(chave?: string | null): string {
  return AVATARES.find((a) => a.chave === chave)?.src ?? `/avatar-${AVATAR_PADRAO}.webp`
}
