import type { ReactNode } from "react"
import { Link } from "react-router"
import type { FolhaId, ObjetoCena } from "@/features/home/cena/tipos"
import { Maquete } from "@/features/home/cena/maquetes"

function Slot({ obj, badge }: { obj: ObjetoCena; badge?: number }) {
  return (
    <span className="relative block w-full" style={{ aspectRatio: obj.proporcao }}>
      {obj.asset?.tipo === "sprite" ? (
        <img src={obj.asset.src} alt="" className="size-full object-contain [image-rendering:pixelated]" />
      ) : obj.asset ? (
        <Maquete id={obj.asset.maquete} />
      ) : null}

      {badge != null && badge > 0 && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-hu-golden px-1 text-[11px] font-bold leading-none text-white"
        >
          {badge}
        </span>
      )}
    </span>
  )
}

function Conteudo({ obj, badge, sufixoRotulo }: { obj: ObjetoCena; badge?: number; sufixoRotulo?: string }) {
  return (
    <>
      <Slot obj={obj} badge={badge} />
      {!obj.semRotulo && (
        <span className="mt-1 max-w-full truncate rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-bold leading-tight text-white">
          {obj.label}
          {sufixoRotulo}
        </span>
      )}
    </>
  )
}

function Posicao({ obj, children }: { obj: ObjetoCena; children: ReactNode }) {
  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: `${obj.x}%`,
        top: `${obj.y}%`,
        width: `${obj.largura}%`,
        zIndex: obj.z ?? 1,
        transform: `translate(-50%, -50%) rotate(${obj.rotacao ?? 0}deg)`,
      }}
    >
      {children}
    </div>
  )
}

const interativo =
  "group flex min-h-11 w-full flex-col items-center rounded-xl outline-none transition-transform " +
  "hover:-translate-y-0.5 active:scale-95 focus-visible:ring-4 focus-visible:ring-hu-bright/60"

export function ObjetoCenaView({
  obj,
  badge,
  badgeRotulo,
  aoAbrirFolha,
}: {
  obj: ObjetoCena
  badge?: number
  badgeRotulo?: string
  aoAbrirFolha: (folha: FolhaId) => void
}) {
  const conteudo = <Conteudo obj={obj} badge={badge} sufixoRotulo={badge ? badgeRotulo : undefined} />
  const realce = obj.destaque ? " drop-shadow-[0_4px_0_rgba(0,0,0,.25)]" : ""

  return (
    <Posicao obj={obj}>
      {obj.acao.tipo === "rota" ? (
        <Link to={obj.acao.para} aria-label={obj.label} className={interativo + realce}>
          {conteudo}
        </Link>
      ) : (
        <button
          type="button"
          aria-label={obj.label}
          onClick={() => obj.acao.tipo === "folha" && aoAbrirFolha(obj.acao.folha)}
          className={interativo + realce}
        >
          {conteudo}
        </button>
      )}
    </Posicao>
  )
}

export function ObjetoConteudoView({ obj, children }: { obj: ObjetoCena; children: ReactNode }) {
  return (
    <Posicao obj={obj}>
      <div className="mx-auto max-h-[64svh] w-full max-w-lg overflow-auto">{children}</div>
    </Posicao>
  )
}
