import { Cake, Home, Lock, Users } from "lucide-react"
import { useHorticultores } from "@/features/admin/use-painel-admin"
import { Barra, Cartao, Numero } from "@/features/admin/blocos"
import { RACAS, SEXOS } from "@/features/usuarios/horticultor"
import { Voltar } from "@/components/voltar"
import { Aviso, Carregando, EstadoVazio } from "@/components/feedback"
import { plural } from "@/lib/utils"

const FAIXAS: Record<string, string> = {
  ATE_29: "Até 29 anos",
  "30_44": "30 a 44 anos",
  "45_59": "45 a 59 anos",
  "60_MAIS": "60 anos ou mais",
}

const ROTULO_SEXO = Object.fromEntries(SEXOS.map((s) => [s.valor, s.rotulo]))
const ROTULO_RACA = Object.fromEntries(RACAS.map((r) => [r.valor, r.rotulo]))

export function HorticultoresPage() {
  const perfil = useHorticultores()

  if (perfil.isPending) return <Carregando />

  if (perfil.isError || !perfil.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <Aviso variante="erro" className="mt-6" aoTentarNovamente={() => perfil.refetch()}>
          Não foi possível carregar os dados. Veja sua internet e tente de novo.
        </Aviso>
      </div>
    )
  }

  const p = perfil.data
  const oculto = `menos de ${p.limiar_supressao}`

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-4">
      <Voltar />
      <h1 className="font-pixel text-sm leading-relaxed text-hu-bright">Quem cultiva</h1>

      {p.total === 0 ? (
        <EstadoVazio ilustracao="/personagem-idoso.webp">
          Ninguém cadastrado nas hortas ainda.
        </EstadoVazio>
      ) : (
        <>
          <Cartao titulo="No município" icone={Users}>
            <div className="grid grid-cols-3 gap-3">
              <Numero valor={p.total} rotulo="horticultores" />
              <Numero valor={p.informaram} rotulo="informaram seus dados" />
              <Numero valor={p.alcance_estimado} rotulo="pessoas nas famílias" />
            </div>
          </Cartao>

          {p.informaram === 0 ? (
            <p className="rounded-2xl border-2 border-hu-soft bg-hu-panel p-6 text-center text-sm text-hu-muted">
              Ninguém preencheu os dados do perfil ainda. Eles são opcionais e cada
              pessoa preenche os seus em Configurações.
            </p>
          ) : (
            <>
              <Cartao titulo="Idade" icone={Cake}>
                <ul className="flex flex-col gap-2.5">
                  {p.faixa_etaria.map((f) => (
                    <Barra
                      key={f.rotulo}
                      rotulo={FAIXAS[f.rotulo] ?? f.rotulo}
                      valor={f.n}
                      total={p.informaram}
                      textoOculto={oculto}
                    />
                  ))}
                </ul>
              </Cartao>

              <Cartao titulo="Sexo" icone={Users}>
                <ul className="flex flex-col gap-2.5">
                  {p.sexo.map((f) => (
                    <Barra
                      key={f.rotulo}
                      rotulo={ROTULO_SEXO[f.rotulo] ?? f.rotulo}
                      valor={f.n}
                      total={p.informaram}
                      textoOculto={oculto}
                    />
                  ))}
                </ul>
              </Cartao>

              <Cartao titulo="Cor ou raça" icone={Users}>
                <ul className="flex flex-col gap-2.5">
                  {p.raca_cor.map((f) => (
                    <Barra
                      key={f.rotulo}
                      rotulo={ROTULO_RACA[f.rotulo] ?? f.rotulo}
                      valor={f.n}
                      total={p.informaram}
                      textoOculto={oculto}
                    />
                  ))}
                </ul>
                <p className="mt-3 text-sm text-hu-muted">
                  Categorias do IBGE, para poder comparar com o Censo.
                </p>
              </Cartao>

              {p.grupo_familiar_medio != null && (
                <Cartao titulo="Famílias" icone={Home}>
                  <p className="text-sm text-hu-muted">
                    Em média,{" "}
                    <span className="font-bold text-hu-text">
                      {p.grupo_familiar_medio.toLocaleString("pt-BR")} pessoas
                    </span>{" "}
                    por família. Somando quem informou, a horta chega a{" "}
                    <span className="font-bold text-hu-text">
                      {plural(p.alcance_estimado, "pessoa", "pessoas")}
                    </span>
                    .
                  </p>
                </Cartao>
              )}
            </>
          )}

          <p className="flex items-start gap-2 px-1 text-sm text-hu-muted">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            Grupos com menos de {p.limiar_supressao} pessoas não aparecem, para que
            ninguém possa ser identificado. Estes dados são sempre somados — nunca
            mostram quem respondeu o quê.
          </p>
        </>
      )}
    </div>
  )
}
