import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"
import { useMe } from "@/features/auth/use-me"
import { useMeuCanteiro } from "@/features/canteiro/use-meu-canteiro"
import { useCiclos } from "@/features/ciclos/use-ciclos"
import { useNomeProduto } from "@/features/produtos/use-nome-produto"
import { sincronizarLembretes } from "./lembretes"

export function useLembretesColheita() {
  const me = useMe()
  // O lembrete é notificação local do app — na web não há o que agendar, então
  // nem vale buscar os dados. Admin é o único papel que não cuida de canteiro.
  const ativo =
    Capacitor.isNativePlatform() &&
    me.data != null &&
    me.data.privilegio !== "ADMIN_SUPREMO"

  const canteiro = useMeuCanteiro(ativo)
  const ciclos = useCiclos(ativo ? canteiro.data?.id : undefined)
  const nomeProduto = useNomeProduto()

  const dados = ciclos.data
  useEffect(() => {
    if (!ativo || !dados) return
    void sincronizarLembretes(dados, nomeProduto)
  }, [ativo, dados, nomeProduto])
}
