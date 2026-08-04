import { Flag, Leaf, Package, Sprout, Users } from "lucide-react"
import { usePanorama } from "@/features/admin/use-painel-admin"
import { Atalho, Cartao, Fala, Numero } from "@/features/admin/blocos"
import { Voltar } from "@/components/voltar"
import { Aviso, Carregando } from "@/components/feedback"
import { plural } from "@/lib/utils"

const m2 = (v: number) => `${v.toLocaleString("pt-BR")} m²`

export function ResumoPage() {
  const panorama = usePanorama()

  if (panorama.isPending) return <Carregando />

  if (panorama.isError || !panorama.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <Voltar />
        <Aviso variante="erro" className="mt-6" aoTentarNovamente={() => panorama.refetch()}>
          Não foi possível carregar o resumo. Veja sua internet e tente de novo.
        </Aviso>
      </div>
    )
  }

  const p = panorama.data

  const veredito =
    p.demandas.abertas > 0
      ? `${plural(p.demandas.abertas, "horta está pedindo", "hortas estão pedindo")} ajuda!`
      : p.hortas.paradas > 0
        ? `${plural(p.hortas.paradas, "horta está", "hortas estão")} sem plantar há mais de ${p.dias_sem_plantio} dias.`
        : p.hortas.sem_lider > 0
          ? `${plural(p.hortas.sem_lider, "horta está", "hortas estão")} sem líder.`
          : "Tudo em dia nas hortas! 🌱"

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-4">
      <Voltar />
      <Fala>{veredito}</Fala>

      <Cartao titulo="Hortas" icone={Leaf}>
        <div className="grid grid-cols-3 gap-3">
          <Numero valor={p.hortas.ativas} rotulo="em atividade" />
          <Numero valor={p.hortas.sem_lider} rotulo="sem líder" atencao={p.hortas.sem_lider > 0} />
          <Numero
            valor={p.hortas.paradas}
            rotulo={`sem plantar há ${p.dias_sem_plantio} dias`}
            atencao={p.hortas.paradas > 0}
          />
        </div>
      </Cartao>

      <Cartao titulo="Canteiros" icone={Sprout}>
        <div className="grid grid-cols-3 gap-3">
          <Numero valor={p.canteiros.ativos} rotulo="no total" />
          <Numero valor={p.canteiros.com_responsavel} rotulo="com responsável" />
          <Numero
            valor={p.canteiros.ociosos}
            rotulo="sem ninguém cuidando"
            atencao={p.canteiros.ociosos > 0}
          />
        </div>
        <p className="mt-3 border-t border-hu-soft/40 pt-3 text-sm text-hu-muted">
          Área cultivada: <span className="font-bold text-hu-text">{m2(p.canteiros.area_produtiva_m2)}</span>
          {p.canteiros.area_ociosa_m2 > 0 && (
            <> · parada: <span className="font-bold text-hu-text">{m2(p.canteiros.area_ociosa_m2)}</span></>
          )}
        </p>
      </Cartao>

      <Cartao titulo={`Produção dos últimos ${p.dias} dias`} icone={Sprout}>
        <div className="grid grid-cols-3 gap-3">
          <Numero valor={p.producao.plantios} rotulo="plantios" />
          <Numero valor={p.producao.colheitas} rotulo="colheitas" />
          <Numero valor={p.producao.perdas} rotulo="perdas" atencao={p.producao.perdas > 0} />
        </div>
        {p.producao.perdas > 0 && (
          <p className="mt-3 border-t border-hu-soft/40 pt-3 text-sm text-hu-muted">
            {p.producao.perdas_climaticas === 0
              ? "Nenhuma perda foi por causa do clima."
              : `${plural(p.producao.perdas_climaticas, "perda foi", "perdas foram")} por causa do clima (geada, seca, chuva ou calor).`}
          </p>
        )}
      </Cartao>

      <Cartao titulo="Pessoas" icone={Users}>
        <div className="grid grid-cols-3 gap-3">
          <Numero valor={p.pessoas.membros} rotulo="membros" />
          <Numero valor={p.pessoas.lideres} rotulo="líderes" />
        </div>
      </Cartao>

      <Cartao titulo="Pedidos das hortas" icone={Package}>
        <div className="grid grid-cols-3 gap-3">
          <Numero valor={p.demandas.abertas} rotulo="aguardando" atencao={p.demandas.abertas > 0} />
          <Numero valor={p.demandas.em_atendimento} rotulo="em andamento" />
        </div>
      </Cartao>

      <div className="flex flex-col gap-2">
        <Atalho para="/painel/producao" icone={Sprout}>
          Produção e perdas, mês a mês
        </Atalho>
        <Atalho para="/painel/horticultores" icone={Users}>
          Quem cultiva nas hortas
        </Atalho>
        <Atalho para="/painel/admin-demandas" icone={Package}>
          Atender os pedidos das hortas
        </Atalho>
        <Atalho para="/painel/moderacao" icone={Flag}>
          Denúncias do fórum
        </Atalho>
      </div>
    </div>
  )
}
