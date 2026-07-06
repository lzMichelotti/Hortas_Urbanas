import type { Cena } from "@/features/home/cena/tipos"

export const cenaMembro: Cena = {
  proporcao: 0,

  objetos: [
    {
      id: "horta",
      label: "Minha horta",
      x: 50,
      y: 48,
      largura: 92,
      proporcao: 1,
      destaque: true,
      acao: { tipo: "conteudo" },
      z: 2,
    },
    {
      id: "pedidos",
      label: "Pedidos",
      x: 19,
      y: 86,
      largura: 26,
      proporcao: 1.3,
      acao: { tipo: "rota", para: "/painel/comunidade" },
      badge: "pedidos",
      asset: { tipo: "maquete", maquete: "carrinho" },
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
