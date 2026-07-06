# Brief de Arte — Hortas Urbanas

Pixel-art, fundo transparente, paleta limitada. Referência de estilo: `plantar.png` e `colher.png`.

---

## Prioridade 1 — Logo

Aparece grande no centro da tela de login e pequeno no canto superior esquerdo do cabeçalho em todas as telas. Entregar em **SVG** + PNG em 192px e 512px (para atalho no Android).

---

## Prioridade 2 — Catálogo de produtos (67 itens)

Aparece ao lado do nome da planta em todas as telas principais: Plantar, Colher, Calendário e Pedidos. É o que o usuário vê em toda interação do dia a dia. Precisa ser reconhecível em ~48px — priorize silhueta e cor característica.

### Hortaliças (46)
Abóbora · Abobrinha · Agrião · Alface Inverno · Alface Verão · Alho · Alho Poró · Almeirão ·
Batata · Batata Doce · Berinjela · Beterraba · Brócolis Inverno · Brócolis Verão · Cebola ·
Cebolinha · Cenoura Inverno · Cenoura Verão · Chicória · Chuchu · Coentro · Couve ·
Couve Chinesa · Couve Flor Inverno · Couve Flor Verão · Ervilha · Espinafre · Feijão-Vagem ·
Gengibre · Inhame · Maxixe · Melancia · Melão · Milho Verde · Moranga · Mostarda · Nabo ·
Pimenta · Pimentão · Quiabo · Rabanete · Repolho Inverno · Repolho Verão · Rúcula · Salsa · Tomate

### Frutas (21)
Abacate · Abacaxi · Ameixa · Banana · Bergamota · Caqui · Figo · Goiaba · Jaboticaba · Kiwi ·
Laranja · Limão · Maçã · Mamão · Manga · Maracujá · Morango · Pera · Pêssego · Pitaya · Uva

> Os pares Inverno/Verão podem ser a mesma arte — alface, cenoura, brócolis, repolho e couve-flor.

---

## Prioridade 3 — Ícones de ação

Aparecem nos botões grandes da tela inicial, estilo menu de jogo. São a primeira coisa que o usuário vê depois do login.

- **Plantar**  já existe
- **Colher** já existe
- **Calendário** — abre o calendário de plantios e colheitas do membro
- **Meus pedidos** — abre a lista onde o membro pede ao líder o que quer plantar
- **Minha horta** — abre a visão geral da horta para o líder
- **Solicitações** — abre a lista de pedidos dos membros que o líder precisa aprovar ou recusar
- **Demandas** — abre a tela onde o líder pede materiais (semente, adubo, ferramenta) à prefeitura
- **Membros** — abre a lista de membros da horta para o líder gerenciar
- **Mapa** já existe

---

## Prioridade 4 — Estados de feedback

Aparecem sozinhos no centro da tela quando algo acontece.

- **Sucesso** — depois que o usuário planta ou colhe com sucesso
- **Erro** — quando a internet cai; precisa ser amigável, não assustador
- **Vazio** — quando o canteiro não tem nada plantado ainda, convidando a começar

---

## Prioridade 5 — Ciclo da planta

Pequenas "selinhas" ao lado de cada planta nas telas de Colher e Calendário. Devem se distinguir por **forma**, não só por cor.

Plantado · Crescendo · Pronto para colher · Colhido · Perdido

---

## Prioridade 6 — Cenário do canteiro (cerca, parreira, moldura)

Enquadram a grade de plantas do membro, pra deixar o canteiro mais agradável sem poluir.
**Há um mockup provisório em código** (pixel/CSS) já rodando — abra `/preview/cena` no app
(rota pública, sem login) ou veja o componente `src/features/canteiro/decoracoes.tsx`. É a
**referência visual da ideia**; a arte final substitui cada peça trocando o campo `asset` da
cena (1 campo), sem mexer no layout.

Pixel-art, fundo transparente, mesma paleta de madeira/folha já usada. Devem funcionar como
**moldura** ao redor da grade — nunca por cima das plantas (que são alvos de toque).

- **Parreira / pergola com videira** — barra horizontal no topo do canteiro, com ripas, folhas
  e alguns cachos de uva pendentes. Dá profundidade. Precisa ladear em larguras variadas.
- **Cerca baixa de madeira** — fileira de estacas com pontas, na frente/base do canteiro.
  Também em larguras variadas (a grade muda de tamanho conforme o nº de plantas).
- **Plaquinha de madeira** — placa pequena pendurada/fincada com o nome do canteiro.
- **Detalhes opcionais** (se sobrar fôlego): pedras de borda, uma borboleta, mourões de canto.
