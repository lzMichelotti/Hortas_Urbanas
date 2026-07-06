import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"
import { useMe } from "@/features/auth/use-me"
import { useMeuCanteiro } from "@/features/canteiro/use-meu-canteiro"
import { useCiclos } from "@/features/ciclos/use-ciclos"
import { useNomeProduto } from "@/features/produtos/use-nome-produto"
import { sincronizarLembretes } from "./lembretes"

export function useLembretesColheita() {
  const me = useMe()
  const ehMembro = me.data?.privilegio === "MEMBRO_CANTEIRO"
  const canteiro = useMeuCanteiro()
  const ciclos = useCiclos(ehMembro ? canteiro.data?.id : undefined)
  const nomeProduto = useNomeProduto()

  const dados = ciclos.data
  useEffect(() => {
    if (!ehMembro || !dados || !Capacitor.isNativePlatform()) return
    void sincronizarLembretes(dados, nomeProduto)
  }, [ehMembro, dados, nomeProduto])
}
