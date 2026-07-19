import type { Cena } from "@/features/home/cena/tipos"

export const cenaAdmin: Cena = {
  proporcao: 0,

  objetos: [
    {
      id: "hortas",
      label: "Hortas",
      x: 50,
      y: 46,
      largura: 92,
      proporcao: 1,
      destaque: true,
      acao: { tipo: "conteudo" },
      z: 2,
    },
    {
      id: "demandas",
      label: "Demandas",
      x: 19,
      y: 85,
      largura: 20,
      proporcao: 1,
      acao: { tipo: "rota", para: "/painel/admin-demandas" },
      badge: "demandas",
      asset: { tipo: "sprite", src: "/demandas.png" },
      z: 3,
    },
    {
      id: "avatar",
      label: "Abrir menu",
      x: 80,
      y: 83,
      largura: 30,
      proporcao: 0.78,
      semRotulo: true,
      acao: { tipo: "folha", folha: "menu" },
      asset: { tipo: "maquete", maquete: "avatar" },
      z: 3,
    },
  ],
}
