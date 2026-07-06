import { Plantinha, type Estagio } from "@/components/plantinha"

export type MaqueteId = "horta" | "carrinho" | "avatar"

const MADEIRA_ESCURA = "#5b3a1a"
const TERRA_ARADA = {
  backgroundColor: "#a06a3c",
  backgroundImage:
    "repeating-linear-gradient(90deg, rgba(0,0,0,0) 0 9px, rgba(0,0,0,.20) 9px 12px)," +
    "repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 9px, rgba(0,0,0,.06) 9px 12px)",
}

const ROCA: Estagio[] = [
  "semente", "broto", "crescendo", "quase",
  "broto", "crescendo", "quase", "pronta",
  "crescendo", "semente", "quase", "pronta",
]

function MaqueteHorta() {
  return (
    <div className="size-full drop-shadow-[0_4px_0_rgba(0,0,0,.25)]">
      <div
        className="grid size-full grid-cols-4 grid-rows-3 gap-x-[3%] gap-y-[2%] rounded-[8px] border-4 p-[4%] shadow-[inset_0_0_0_3px_rgba(0,0,0,.15)]"
        style={{ ...TERRA_ARADA, borderColor: MADEIRA_ESCURA }}
      >
        {ROCA.map((estagio, i) => (
          <span key={i} className="flex items-center justify-center">
            <Plantinha estagio={estagio} className="h-[92%] w-auto" />
          </span>
        ))}
      </div>
    </div>
  )
}

function MaqueteCarrinho() {
  return (
    <div className="flex size-full items-end justify-center">
      <img
        src="/carrinho.png"
        alt=""
        className="h-[80%] w-auto object-contain [image-rendering:pixelated] drop-shadow-[0_3px_0_rgba(0,0,0,.2)]"
      />
    </div>
  )
}

function MaqueteAvatar() {
  return (
    <div className="flex size-full flex-col items-center justify-end gap-1">
      <div className="relative w-full rounded-xl border-[3px] border-[#5b3a1a] bg-white px-2 py-1.5 text-center shadow-[0_3px_0_rgba(0,0,0,.18)]">
        <span className="text-xs font-bold leading-tight text-[#1b2e1f]">O que você precisa?</span>
        <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-[#5b3a1a] bg-white" />
      </div>
      <img src="/persona-pixel.png" alt="" className="h-[72%] w-auto object-contain [image-rendering:pixelated] drop-shadow-[0_3px_0_rgba(0,0,0,.25)]" />
    </div>
  )
}

const MAQUETES: Record<MaqueteId, () => React.ReactElement> = {
  horta: MaqueteHorta,
  carrinho: MaqueteCarrinho,
  avatar: MaqueteAvatar,
}

export function Maquete({ id }: { id: MaqueteId }) {
  const Comp = MAQUETES[id]
  return <Comp />
}
