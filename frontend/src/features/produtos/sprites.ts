const DISPONIVEIS = new Set([
  "abacate", "abacaxi", "abobora", "abobrinha", "agriao", "alface", "alho", "alho-poro",
  "almeirao", "ameixa", "banana", "batata", "batata-doce", "bergamota", "berinjela",
  "beterraba", "brocolis", "caqui", "cebola", "cebolinha", "cenoura", "chicoria", "chuchu",
  "coentro", "couve", "couve-chinesa", "couve-flor", "ervilha", "espinafre", "feijao-vagem",
  "figo", "gengibre", "goiaba", "inhame", "jabuticaba", "kiwi", "laranja",
  "limao", "maca", "mamao", "manga", "maracuja", "maxixe", "melancia", "melao",
  "milho-verde", "moranga", "morango", "mostarda", "nabo", "pepino", "pera", "pessego",
  "pimenta", "pimentao", "pitaya", "quiabo", "rabanete", "repolho", "rucula", "salsa", "tomate", "uva",
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
