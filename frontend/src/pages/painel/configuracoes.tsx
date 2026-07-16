import { useState } from "react"
import { LogOut } from "lucide-react"
import { FalaDaGuia } from "@/components/guia"
import { useMe } from "@/features/auth/use-me"
import { useLogout } from "@/features/auth/use-logout"
import { ROTULO_PAPEL } from "@/features/auth/papeis"
import { useMeuCanteiro } from "@/features/canteiro/use-meu-canteiro"
import { AVATARES, AVATAR_PADRAO, srcAvatar } from "@/features/perfil/avatares"
import { useAtualizarAvatar } from "@/features/perfil/use-atualizar-avatar"
import { getTema, setTema, type Tema } from "@/lib/preferencias"

function Segmento({
  rotulo,
  valor,
  opcoes,
  aoEscolher,
}: {
  rotulo: string
  valor: Tema
  opcoes: { v: Tema; l: string }[]
  aoEscolher: (v: Tema) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-hu-text">{rotulo}</p>
      <div className="flex gap-1.5" role="group" aria-label={rotulo}>
        {opcoes.map((o) => {
          const ativo = o.v === valor
          return (
            <button
              key={o.v}
              type="button"
              aria-pressed={ativo}
              onClick={() => aoEscolher(o.v)}
              className={`min-h-11 flex-1 whitespace-nowrap rounded-xl border-2 px-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright ${
                ativo
                  ? "border-hu-bright bg-hu-bright text-hu-bg"
                  : "border-hu-soft bg-transparent text-hu-text hover:bg-black/5"
              }`}
            >
              {o.l}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ConfiguracoesPage() {
  const [tema, setTemaState] = useState<Tema>(getTema)
  const me = useMe()
  const logout = useLogout()
  const ehMembro = me.data?.privilegio === "MEMBRO_CANTEIRO"
  const ehLider = me.data?.privilegio === "LIDER_HORTA"
  const canteiro = useMeuCanteiro(ehMembro)
  const atualizar = useAtualizarAvatar()
  const escolhido = me.data?.avatar ?? AVATAR_PADRAO

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-pixel text-sm text-hu-bright">Configurações</h1>

      <section className="rounded-2xl border-4 border-hu-bright bg-hu-panel p-5 text-hu-text">
        <div className="flex items-center gap-4">
          <img src={srcAvatar(me.data?.avatar)} alt="" className="size-20 shrink-0 rounded-full bg-hu-bright/15 object-cover" />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{me.data?.nome ?? "Bem-vindo!"}</p>
            {me.data && <p className="text-sm text-hu-muted">{ROTULO_PAPEL[me.data.privilegio]}</p>}
            {ehMembro && canteiro.data && (
              <p className="truncate text-sm text-hu-muted">Canteiro: {canteiro.data.identificacao}</p>
            )}
          </div>
        </div>

        <p className="mt-5 mb-2 text-sm font-medium">Sua foto</p>
        <div className="grid grid-cols-4 gap-2">
          {AVATARES.map((a) => {
            const ativo = escolhido === a.chave
            return (
              <button
                key={a.chave}
                type="button"
                aria-pressed={ativo}
                aria-label={a.rotulo}
                disabled={atualizar.isPending}
                onClick={() => atualizar.mutate(a.chave)}
                className={`overflow-hidden rounded-xl border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hu-bright disabled:opacity-60 ${
                  ativo ? "border-hu-bright bg-hu-bright/15" : "border-hu-soft hover:bg-black/5"
                }`}
              >
                <img src={a.src} alt="" className="aspect-square w-full object-cover" />
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border-4 border-hu-bright bg-hu-panel p-5 text-hu-text">
        <Segmento
          rotulo="Tema"
          valor={tema}
          opcoes={[
            { v: "claro", l: "Claro" },
            { v: "escuro", l: "Escuro" },
            { v: "auto", l: "Automático" },
          ]}
          aoEscolher={(v) => {
            setTema(v)
            setTemaState(v)
          }}
        />
        <p className="mt-3 text-xs text-hu-muted">
          No automático, fica claro de dia e escuro à noite, seguindo o sol de Santa Maria.
        </p>
      </section>

      {(ehMembro || ehLider) && (
        <section className="space-y-4 rounded-2xl border-4 border-hu-bright bg-hu-panel p-5">
          <h2 className="font-pixel text-xs text-hu-muted">Como usar</h2>
          {ehLider ? (
            <>
              <FalaDaGuia humor="feliz">Toque na sua horta para ver os canteiros e quem cuida de cada um.</FalaDaGuia>
              <FalaDaGuia>O balão de aviso mostra os pedidos de plantas dos membros.</FalaDaGuia>
            </>
          ) : (
            <>
              <FalaDaGuia humor="feliz">Toque na sua horta: na terra para plantar, na planta pronta para colher.</FalaDaGuia>
              <FalaDaGuia>O carrinho de mão são os seus pedidos de plantas ao líder.</FalaDaGuia>
            </>
          )}
          <FalaDaGuia>Toque em mim, a jardineira, para abrir o menu com tudo.</FalaDaGuia>
          <FalaDaGuia>Para sair, use o botão no canto de cima da tela.</FalaDaGuia>
        </section>
      )}

      <section className="rounded-2xl border-4 border-hu-bright bg-hu-panel p-5">
        <button
          type="button"
          onClick={logout}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-red-400/50 text-base font-bold text-red-600 hover:bg-red-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <LogOut className="size-5" aria-hidden />
          Sair da conta
        </button>
        <p className="mt-3 text-center text-sm text-hu-muted">
          Você volta para a tela de entrada e pode entrar com outra conta.
        </p>
      </section>
    </div>
  )
}
