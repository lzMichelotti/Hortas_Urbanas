import { useState } from "react"
import { Home, LogOut, Settings } from "lucide-react"
import { Cena } from "@/features/home/cena/cena"
import { cenaMembro } from "@/features/home/cena/cena-membro"
import { Maquete } from "@/features/home/cena/maquetes"
import { MolduraCanteiro } from "@/features/canteiro/decoracoes"
import { QuadroMenu } from "@/features/home/quadro-menu"
import { PlaquetaNav } from "@/components/nav-inferior"

const NAV = [
  { icon: Home, label: "Início" },
  { icon: Settings, label: "Config" },
]

export function PreviewCenaPage() {
  const [menu, setMenu] = useState(false)

  return (
    <div className="flex min-h-svh flex-col bg-hu-bg text-hu-text">
      <header className="relative flex items-center justify-center bg-[#8fd0ef] px-4 py-2.5 dark:bg-[#171f3a]">
        <img src="/logo.png" alt="" className="size-10" />
        <span className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-hu-text/70">
          <LogOut className="size-5" aria-hidden />
        </span>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div className="absolute inset-x-0 top-0 bottom-0">
          <Cena
            cena={cenaMembro}
            badges={{ pedidos: { valor: 1 } }}
            slots={{ horta: <MolduraCanteiro etiqueta="Meu canteiro"><Maquete id="horta" /></MolduraCanteiro> }}
            aoAbrirFolha={() => setMenu(true)}
          />
          <QuadroMenu aberta={menu} aoMudar={setMenu} />
        </div>
      </main>

      <nav className="border-t-4 border-[#5b3a1a] bg-[#5da33f] px-1 pt-2 pb-2 dark:border-[#0c160f] dark:bg-[#16291c]">
        <ul className="mx-auto flex max-w-sm items-stretch gap-2">
          {NAV.map(({ icon, label }, i) => (
            <li key={label} className="min-w-0 flex-1">
              <PlaquetaNav Icone={icon} label={label} ativo={i === 0} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
