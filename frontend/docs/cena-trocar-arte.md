# Cenário da home — como ajustar layout e trocar a arte

A home de cada papel pode ser um **cenário** (estilo fazenda) dirigido por
config, **ocupando a tela inteira**. Hoje o **membro do canteiro** usa esse
formato. Cada objeto é desenhado por uma **maquete** (arte-CSS) que mostra a
forma real pretendida — é o que se mostra à artista antes do sprite.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `src/features/home/cena/tipos.ts` | contratos (ObjetoCena, Asset, Acao…) |
| `src/features/home/cena/cena-membro.ts` | **a config** — posição/tamanho/ação/asset de cada objeto |
| `src/features/home/cena/cena.tsx` | palco responsivo (aspect-ratio + objetos absolutos em %) |
| `src/features/home/cena/objeto-cena.tsx` | 1 objeto: slot + rótulo + toque + maquete/sprite |
| `src/features/home/cena/maquetes.tsx` | arte-CSS provisória (a **forma real** de cada objeto, pra artista) |
| `src/features/home/cena/ceu-clima.tsx` | clima real no céu (dado, **não** é arte) |
| `src/features/home/home-membro.tsx` | liga os dados (badges, folha) à cena |
| `src/features/home/index.tsx` | registry por papel (líder/adm encaixam aqui) |
| `src/assets/scene/` | **skin**: os sprites |

## Ajustar o layout (ainda iterando)

Edite **só números** em `cena-membro.ts`:

- `x`, `y` — âncora do centro do objeto, em % do palco (que enche a tela).
- `largura` — largura do objeto em % do palco.
- `proporcao` — aspecto do slot (largura/altura). `cena.proporcao: 0` = palco
  preenche toda a altura disponível; > 0 vira caixa de aspecto fixo.
- `rotacao` — graus (ex.: o mapa "no chão" usa `-8`).
- `z` — empilhamento (objeto "no chão" usa z baixo).

Nada de JSX. O palco usa `aspect-ratio` + filhos `position:absolute` em `%`
([MDN: aspect-ratio](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio)),
então escala em qualquer largura de tela.

## Trocar a arte (maquete → sprite)

Ver `src/assets/scene/README.md`. Resumo: importe o PNG e troque **1 campo**
(`asset`) no objeto: de `{ tipo: "maquete", maquete: "horta" }` para
`{ tipo: "sprite", src: spriteHorta }`. Nada de JSX nem lógica.

## Adicionar a home de outro papel (líder/adm)

1. Crie `cena-lider.ts` (mesma estrutura de `cena-membro.ts`).
2. Crie `home-lider.tsx` (liga os dados daquele papel).
3. Adicione 1 linha no registry `index.tsx`: `LIDER_HORTA: HomeLider`.

Sem tocar no membro nem no `PainelHome`.
