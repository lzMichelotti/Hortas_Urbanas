import { Link } from "react-router"
import { useMe } from "@/features/auth/use-me"
import { cn } from "@/lib/utils"

// O líder também pode ter canteiro próprio — mandá-lo "falar com o líder" seria
// absurdo. Ele mesmo cria o dele na tela de Membros.
export function SemCanteiro({ className }: { className?: string }) {
  const me = useMe()
  const ehLider = me.data?.privilegio === "LIDER_HORTA"

  return (
    <div
      className={cn(
        "rounded-2xl border-4 border-hu-bright bg-hu-panel p-8 text-center text-hu-text",
        className,
      )}
    >
      {ehLider ? (
        <>
          <p className="text-base leading-snug">
            Você ainda não tem um canteiro seu. Crie um em Membros e escolha o seu nome como
            responsável.
          </p>
          <Link
            to="/painel/membros"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[#5b3a1a] bg-hu-bright px-4 font-pixel text-xs leading-tight text-hu-bg shadow-[0_3px_0_#5b3a1a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
          >
            Ir para Membros
          </Link>
        </>
      ) : (
        <p className="text-base leading-snug">
          Você ainda não tem um canteiro. Fale com o líder da sua horta.
        </p>
      )}
    </div>
  )
}
