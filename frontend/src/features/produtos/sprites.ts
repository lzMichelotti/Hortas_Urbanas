const DISPONIVEIS = new Set([
  "abacate", "abacaxi", "abobora", "abobrinha", "alface", "alho", "alho-poro",
  "ameixa", "banana", "batata", "batata-doce", "bergamota", "berinjela",
  "beterraba", "brocolis", "caqui", "cebola", "cebolinha", "cenoura", "chuchu",
  "couve", "couve-chinesa", "couve-flor", "ervilha", "espinafre", "feijao-vagem",
  "figo", "gengibre", "goiaba", "inhame", "jabuticaba", "kiwi", "laranja",
  "limao", "maca", "mamao", "manga", "maracuja", "maxixe", "melancia", "melao",
  "milho-verde", "moranga", "morango", "nabo", "pepino", "pera", "pessego",
  "pimenta", "pimentao", "pitaya", "quiabo", "rabanete", "repolho", "tomate", "uva",
])

const ALIAS: Record<string, string> = {
  jaboticaba: "jabuticaba",
}

function kebab(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function spriteProduto(nome?: string | null): string | null {
  if (!nome) return null
  const base = nome.replace(/\s+(inverno|ver[aã]o)$/i, "")
  const chave = ALIAS[kebab(base)] ?? kebab(base)
  return DISPONIVEIS.has(chave) ? `/produtos/${chave}.png` : null
}
