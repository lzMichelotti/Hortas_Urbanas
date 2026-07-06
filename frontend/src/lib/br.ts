export function formatCPF(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function formatTelefone(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11)
  if (d.length === 0) return ""
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function digitos(valor: string): string {
  return valor.replace(/\D/g, "")
}

export function validarCPF(cpf: string): boolean {
  const d = digitos(cpf)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const calc = (len: number): number => {
    const soma = Array.from({ length: len }, (_, i) => Number(d[i]) * (len + 1 - i)).reduce(
      (a, b) => a + b,
      0,
    )
    const rem = (soma * 10) % 11
    return rem >= 10 ? 0 : rem
  }
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10])
}

export function validarTelefone(tel: string): boolean {
  const n = digitos(tel).length
  return n === 10 || n === 11
}
