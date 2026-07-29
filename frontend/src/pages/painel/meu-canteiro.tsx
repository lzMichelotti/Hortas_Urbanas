import { Voltar } from "@/components/voltar"
import { MolduraCanteiro } from "@/features/canteiro/decoracoes"
import { CanteiroGrade } from "@/features/canteiro/horta-interativa"

// O membro chega ao canteiro pela cena da home; o líder, que também gere a
// horta inteira, chega por esta página a partir do menu.
export function MeuCanteiroPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Voltar />
      <div className="mt-4">
        <MolduraCanteiro etiqueta="Meu canteiro">
          <CanteiroGrade interativo minBlocos={9} />
        </MolduraCanteiro>
      </div>
    </div>
  )
}
