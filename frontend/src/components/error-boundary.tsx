import { Component, type ReactNode } from "react"
import { useLocation } from "react-router"
import { cn } from "@/lib/utils"

type Props = { children: ReactNode; resetKey?: unknown; compacto?: boolean }
type State = { falhou: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { falhou: false }

  static getDerivedStateFromError(): State {
    return { falhou: true }
  }

  componentDidUpdate(prev: Props) {
    if (this.state.falhou && prev.resetKey !== this.props.resetKey) {
      this.setState({ falhou: false })
    }
  }

  render() {
    if (!this.state.falhou) return this.props.children

    return (
      <main
        className={cn(
          "flex flex-col items-center justify-center gap-6 p-6 text-center",
          this.props.compacto ? "min-h-[50svh]" : "min-h-svh bg-hu-bg",
        )}
      >
        <p className="font-pixel text-sm leading-relaxed text-hu-bright">
          Não foi possível carregar.
        </p>
        <p className="max-w-xs text-base text-hu-text/80">
          Verifique sua conexão e tente de novo.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-14 rounded-xl bg-hu-bright px-8 text-lg font-bold text-hu-bg hover:bg-hu-bright/90"
        >
          Tentar de novo
        </button>
      </main>
    )
  }
}

export function RouteBoundary({ children, compacto }: { children: ReactNode; compacto?: boolean }) {
  const { pathname } = useLocation()
  return (
    <ErrorBoundary resetKey={pathname} compacto={compacto}>
      {children}
    </ErrorBoundary>
  )
}
