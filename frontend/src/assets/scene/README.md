# Skin da cena (sprites da home)

Aqui moram **só os assets de arte** dos objetos do cenário da home. A estrutura
(posição, tamanho, ação, lógica) fica em `src/features/home/cena/` — nunca
precisa mexer nela pra trocar a arte.

Hoje cada objeto é desenhado por uma **maquete** (arte-CSS provisória, em
`cena/maquetes.tsx`) que mostra a *forma real* pretendida. Quando a artista
entregar o sprite, ele substitui a maquete:

## Receita de troca (maquete → sprite)

1. Solte o arquivo aqui, ex.: `horta.png` (PNG transparente, pixel-art; ver
   `frontend/docs/brief-arte.md` e o slot dimensionado em `cena-membro.ts`,
   campo `proporcao`).
2. Em `src/features/home/cena/cena-membro.ts`:

   ```ts
   import spriteHorta from "@/assets/scene/horta.png"   // (1) importe

   // no objeto correspondente, troque só o campo `asset`:
   asset: { tipo: "maquete", maquete: "horta" }         // antes
   asset: { tipo: "sprite", src: spriteHorta }          // depois
   ```

Pronto. Sem tocar em JSX nem em lógica.

> Importar o asset (em vez de usar `/public`) deixa o Vite versionar e otimizar
> o arquivo (hash no nome → cache longo; arquivos pequenos viram data-URI inline).
