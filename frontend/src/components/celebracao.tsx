import { useEffect } from "react"
import { Dialog } from "radix-ui"
import { ArtePlanta } from "@/features/produtos/sprite-produto"
import { Guia } from "@/components/guia"
import { RegistrarConquista } from "@/features/forum/registrar-conquista"

type Variante = "plantio" | "colheita" | "pedido"

const PARTICULAS = [
  { cor: "#4ccc6f", x: 14, y: 34, delay: 0,   size: 10, round: true  },
  { cor: "#e0bd63", x: 79, y: 24, delay: 80,  size: 7,  round: false },
  { cor: "#4ccc6f", x: 49, y: 16, delay: 180, size: 12, round: true  },
  { cor: "#a04012", x: 24, y: 63, delay: 40,  size: 6,  round: false },
  { cor: "#e0bd63", x: 69, y: 57, delay: 140, size: 8,  round: true  },
  { cor: "#4ccc6f", x: 89, y: 41, delay: 240, size: 9,  round: false },
  { cor: "#ffffff", x: 11, y: 48, delay: 300, size: 5,  round: true  },
  { cor: "#e0bd63", x: 37, y: 74, delay: 160, size: 7,  round: false },
]

function NucleoFestejo({ nome, variante, titulo }: { nome: string; variante: Variante; titulo: string }) {
  return (
    <>
      {PARTICULAS.map((p, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.cor,
            borderRadius: p.round ? "50%" : "2px",
            animation: `hu-particula 1.3s ease-out ${p.delay}ms both`,
          }}
        />
      ))}

      <span aria-hidden style={{ animation: "hu-surgir 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
        {variante === "pedido" ? (
          <Guia humor="feliz" className="size-32 sm:size-44" />
        ) : (
          <ArtePlanta nome={nome} estagio="pronta" className="size-32 sm:size-44" />
        )}
      </span>

      <div className="flex flex-col items-center gap-2 text-center" style={{ animation: "hu-pop 0.4s ease-out 0.45s both" }}>
        {variante !== "pedido" && <Guia humor="feliz" className="size-14 sm:size-20" />}
        <p className="text-lg font-bold text-white sm:text-xl">{titulo}</p>
      </div>
    </>
  )
}

export function CelebracaoOverlay({
  nome,
  variante = "plantio",
  onDismiss,
}: {
  nome: string
  variante?: Variante
  onDismiss: () => void
}) {
  const titulo =
    variante === "colheita"
      ? `${nome} colhido! 🧺`
      : variante === "pedido"
        ? "Pedido enviado! 🎉"
        : `${nome} plantado! 🌱`

  const podeRegistrar = variante === "plantio" || variante === "colheita"

  useEffect(() => {
    if (podeRegistrar) return
    const t = setTimeout(onDismiss, 2700)
    return () => clearTimeout(t)
  }, [podeRegistrar, onDismiss])

  return (
    <Dialog.Root open onOpenChange={(aberta) => !aberta && onDismiss()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-hu-text/92" />
        {podeRegistrar ? (
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-0 z-[60] overflow-y-auto outline-none"
          >
            <Dialog.Title className="sr-only">{titulo}</Dialog.Title>
            <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4 py-6 sm:gap-6">
              <NucleoFestejo nome={nome} variante={variante} titulo={titulo} />
              <RegistrarConquista variante={variante} nome={nome} onConcluir={onDismiss} />
            </div>
          </Dialog.Content>
        ) : (
          <Dialog.Content
            aria-describedby={undefined}
            onClick={onDismiss}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 px-4 outline-none sm:gap-6"
          >
            <Dialog.Title className="sr-only">{titulo}</Dialog.Title>
            <NucleoFestejo nome={nome} variante={variante} titulo={titulo} />
            <p className="text-sm text-white/70">Toque para continuar</p>
          </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  )
}
