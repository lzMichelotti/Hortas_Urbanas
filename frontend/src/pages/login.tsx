import { type FormEvent, useRef, useState } from "react"
import { Link, Navigate, useNavigate } from "react-router"
import { X } from "lucide-react"
import { useLogin } from "@/features/auth/use-login"
import { isAuthenticated } from "@/lib/auth/session"
import { ApiError } from "@/lib/api/errors"
import { formatCPF, digitos } from "@/lib/br"
import { Aviso } from "@/components/feedback"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function mensagemLogin(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "E-mail ou CPF não conferem. Confira e tente de novo."
    if (error.status === 0) return error.message
  }
  return "Não foi possível entrar agora. Aguarde um instante e tente de novo."
}

export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")
  const emailRef = useRef<HTMLInputElement>(null)
  const cpfRef = useRef<HTMLInputElement>(null)

  if (isAuthenticated()) {
    return <Navigate to="/painel" replace />
  }

  const podeEnviar = email.trim().length > 0 && cpf.length === 11

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    login.mutate(
      { email: email.trim(), cpf },
      { onSuccess: () => navigate("/painel", { replace: true }) },
    )
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-hu-bg p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-[2rem] border-8 border-hu-bright bg-hu-panel p-6 text-hu-text shadow-2xl sm:p-8"
      >
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="" width={112} height={112} className="size-28" />
          <h1 className="text-center font-pixel text-base leading-relaxed text-hu-text sm:text-lg">
            Hortas Urbanas
          </h1>
        </div>

        <div className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-hu-text">
              E-mail
            </Label>
            <div className="relative">
              <Input
                id="email"
                ref={emailRef}
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-2 border-hu-soft bg-hu-bg pr-12 text-hu-text"
              />
              {email.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setEmail("")
                    emailRef.current?.focus()
                  }}
                  aria-label="Limpar e-mail"
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-hu-muted hover:text-hu-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
                >
                  <X className="size-5" aria-hidden />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cpf" className="text-hu-text">
              CPF
            </Label>
            <div className="relative">
              <Input
                id="cpf"
                ref={cpfRef}
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={formatCPF(cpf)}
                maxLength={14}
                onChange={(e) => setCpf(digitos(e.target.value).slice(0, 11))}
                className="h-12 rounded-xl border-2 border-hu-soft bg-hu-bg pr-12 text-hu-text"
              />
              {cpf.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCpf("")
                    cpfRef.current?.focus()
                  }}
                  aria-label="Limpar CPF"
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-hu-muted hover:text-hu-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright"
                >
                  <X className="size-5" aria-hidden />
                </button>
              )}
            </div>
          </div>

          {login.isError && <Aviso variante="erro">{mensagemLogin(login.error)}</Aviso>}

          <Button
            type="submit"
            disabled={!podeEnviar || login.isPending}
            className="h-14 rounded-xl bg-hu-bright text-lg font-bold text-hu-bg hover:bg-hu-bright/90"
          >
            {login.isPending ? "Entrando…" : "Entrar"}
          </Button>
        </div>
        <details className="mt-5 text-sm">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-lg px-3 font-medium text-hu-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright">
            Como faço para entrar?
          </summary>
          <div className="mt-2 rounded-xl border-2 border-hu-soft bg-black/5 p-4 leading-relaxed text-hu-text">
            <p>Seu acesso é criado pelo líder da sua horta ou pela administração.</p>
            <p className="mt-2">
              Entre com o seu <strong>e-mail</strong> e, como senha, o seu <strong>CPF</strong> (só os números).
            </p>
            <p className="mt-2 text-hu-muted">Ainda não tem acesso? Fale com o líder da sua horta.</p>
          </div>
        </details>
      </form>

      <Link
        to="/mapa"
        aria-label="Ver as hortas no mapa, sem precisar entrar"
        className="group flex flex-col items-center gap-2 transition-transform hover:-translate-y-0.5"
      >
        <span className="flex -rotate-6 flex-col items-center">
          <span className="relative rounded-sm border-[3px] border-[#5b3a1a] bg-[#8a5a2b] px-4 py-2 shadow-[0_4px_0_#5b3a1a]">
            <span className="absolute left-1.5 top-1.5 size-1 rounded-full bg-[#5b3a1a]" />
            <span className="absolute right-1.5 top-1.5 size-1 rounded-full bg-[#5b3a1a]" />
            <span className="absolute bottom-1.5 left-1.5 size-1 rounded-full bg-[#5b3a1a]" />
            <span className="absolute bottom-1.5 right-1.5 size-1 rounded-full bg-[#5b3a1a]" />
            <span className="font-pixel text-xs text-[#ffe8c2]">MAPA</span>
          </span>
          <span className="h-6 w-2.5 bg-[#5b3a1a]" />
        </span>
      </Link>
    </main>
  )
}
