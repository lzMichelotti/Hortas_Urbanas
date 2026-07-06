import {
  Container,
  Droplet,
  Droplets,
  Layers,
  Mountain,
  Package,
  Pickaxe,
  Recycle,
  Scissors,
  Shovel,
  Sprout,
  Wrench,
  type LucideIcon,
} from "lucide-react"

export type FonteItens = "plantio" | "lista" | "livre"

export interface ItemMaterial {
  id: string
  rotulo: string
  Icone: LucideIcon
  unidade: string
}

export interface CategoriaMaterial {
  id: string
  rotulo: string
  Icone: LucideIcon
  fonte: FonteItens
  unidadePadrao: string
  itens: ItemMaterial[]
}

export const CATEGORIAS_MATERIAL: CategoriaMaterial[] = [
  {
    id: "mudas",
    rotulo: "Mudas e sementes",
    Icone: Sprout,
    fonte: "plantio",
    unidadePadrao: "unidades",
    itens: [],
  },
  {
    id: "ferramentas",
    rotulo: "Ferramentas",
    Icone: Wrench,
    fonte: "lista",
    unidadePadrao: "unidades",
    itens: [
      { id: "pa", rotulo: "Pá", Icone: Shovel, unidade: "unidades" },
      { id: "enxada", rotulo: "Enxada", Icone: Pickaxe, unidade: "unidades" },
      { id: "regador", rotulo: "Regador", Icone: Droplets, unidade: "unidades" },
      { id: "tesoura", rotulo: "Tesoura de poda", Icone: Scissors, unidade: "unidades" },
    ],
  },
  {
    id: "adubo",
    rotulo: "Adubo e terra",
    Icone: Shovel,
    fonte: "lista",
    unidadePadrao: "sacos",
    itens: [
      { id: "terra", rotulo: "Terra adubada", Icone: Mountain, unidade: "sacos" },
      { id: "composto", rotulo: "Composto orgânico", Icone: Recycle, unidade: "sacos" },
      { id: "humus", rotulo: "Húmus de minhoca", Icone: Layers, unidade: "sacos" },
      { id: "calcario", rotulo: "Calcário", Icone: Container, unidade: "sacos" },
    ],
  },
  {
    id: "agua",
    rotulo: "Água e irrigação",
    Icone: Droplets,
    fonte: "lista",
    unidadePadrao: "litros",
    itens: [
      { id: "agua", rotulo: "Água", Icone: Droplet, unidade: "litros" },
      { id: "gotejador", rotulo: "Gotejador", Icone: Droplets, unidade: "unidades" },
    ],
  },
  {
    id: "outro",
    rotulo: "Outra coisa",
    Icone: Package,
    fonte: "livre",
    unidadePadrao: "unidades",
    itens: [],
  },
]
