import type { ComponentType } from "react"
import type { components } from "@/lib/api/schema"
import { HomeMembro } from "@/features/home/home-membro"
import { HomeLider } from "@/features/home/home-lider"

type Privilegio = components["schemas"]["Privilegio"]

export const HOME_DO_PAPEL: Partial<Record<Privilegio, ComponentType>> = {
  MEMBRO_CANTEIRO: HomeMembro,
  LIDER_HORTA: HomeLider,
}
