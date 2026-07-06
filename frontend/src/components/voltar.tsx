import { useLocation, useNavigate } from "react-router"
import { ArrowLeft } from "lucide-react"

export function Voltar({ to = "/painel", label = "Voltar" }: { to?: string; label?: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  // Volta no histórico quando há entrada anterior dentro do app (o RR marca a
  // entrada inicial com key "default"); senão vai para o destino padrão. Evita
  // sair do app ao usar navigate(-1) sem histórico (alerta da doc do RR).
  const podeVoltar = location.key !== "default"

  return (
    <button
      type="button"
      onClick={() => (podeVoltar ? navigate(-1) : navigate(to))}
      className="-m-2 inline-flex items-center gap-2 rounded-lg p-2 text-base font-medium text-hu-bright transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-hu-bright/50"
    >
      <ArrowLeft className="size-5" aria-hidden />
      {label}
    </button>
  )
}
