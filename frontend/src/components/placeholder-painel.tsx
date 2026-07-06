import { Voltar } from "@/components/voltar"

export function PlaceholderPainel({ titulo }: { titulo: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Voltar />
      <div className="mt-6 rounded-2xl border-4 border-hu-bright bg-hu-panel p-8 text-center">
        <h1 className="font-pixel text-sm text-hu-text">{titulo}</h1>
        <p className="mt-4 text-hu-muted">Em construção 🌱</p>
      </div>
    </div>
  )
}
