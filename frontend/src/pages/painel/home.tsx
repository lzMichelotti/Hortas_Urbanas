import { useMe } from "@/features/auth/use-me"
import { Carregando, FalhaAoCarregar } from "@/components/feedback"
import { HOME_DO_PAPEL } from "@/features/home"

export function PainelHome() {
  const me = useMe()
  if (me.isLoadingError) return <FalhaAoCarregar className="mx-auto mt-6 max-w-2xl" />
  if (me.isPending || !me.data) return <Carregando />

  const HomeDoPapel = HOME_DO_PAPEL[me.data.privilegio]
  return <HomeDoPapel />
}
