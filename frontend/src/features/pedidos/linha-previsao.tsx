import { Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import { textoPrevisao } from "./previsao"

export function LinhaPrevisao({ previsao, className }: { previsao: string; className?: string }) {
  return (
    <p className={cn("flex items-center gap-1.5 text-sm font-bold text-hu-text", className)}>
      <Truck className="size-4 shrink-0 text-hu-bright" aria-hidden />
      {textoPrevisao(previsao)}
    </p>
  )
}
