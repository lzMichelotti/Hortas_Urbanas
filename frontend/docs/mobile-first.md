# Frontend — Parte 3: Mobile-first

Registro das mudanças de experiência mobile e das fontes oficiais que as fundamentam.
Público-alvo: celulares modestos, 3G instável. Princípio: **mobile-first, não mobile-only** —
o desktop (sobretudo o mapa) continua funcionando. Tudo via breakpoints do Tailwind (`md:`).

## 1. Navegação inferior (`src/components/nav-inferior.tsx`)

- **Problema:** trocar de seção exigia seção → "Voltar" → home → outra seção. Sem navegação
  persistente alcançável pelo polegar.
- **Solução:** *bottom navigation* fixa, **só no mobile** (`md:hidden`); no desktop a grade da home
  segue intocada. Por papel, ≤5 atalhos (Mapa e telas raras ficam só na home). **Ícone + rótulo**
  (não depende só do ícone), alvos ≥44px (`min-h-14`), estado ativo via `NavLink` (`isActive`).
- `<main>` do painel ganhou respiro inferior no mobile (`pb-[calc(5rem+env(safe-area-inset-bottom))]`)
  para o conteúdo não ficar atrás da barra. Barra com `pb-[env(safe-area-inset-bottom)]`.
- Zero dependência nova (Lucide + React Router já presentes).
  - `NavLink` (estado ativo idiomático, RR7): https://reactrouter.com/api/components/NavLink
  - `env(safe-area-inset-*)`: https://developer.mozilla.org/en-US/docs/Web/CSS/env
  - Responsivo `md:`: https://tailwindcss.com/docs/responsive-design
  - Alvo de toque (WCAG 2.2 SC 2.5.5/2.5.8): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

## 2. Mapa: folhas inferiores no mobile (`src/components/ui/folha-inferior.tsx`, `src/pages/mapa.tsx`, `src/features/mapa/clima-widget.tsx`)

- **Problema:** os painéis flutuantes "Buscar por perto" (`w-72`) e Clima (`w-64`) tampavam o mapa
  em telas de 320–414px e não dava para fechar.
- **Solução:** no desktop os painéis flutuantes seguem iguais (`hidden md:flex` / `md:block`); no
  mobile, dois botões grandes no alcance do polegar abrem **folhas inferiores** (`FolhaInferior`).
- `FolhaInferior` é construída sobre **Radix Dialog** (já em `radix-ui`): foco preso, fecha no Esc e
  no overlay, `aria` e scroll-lock — acessibilidade pronta, sem reinventar. Alça de arraste visual,
  título e botão fechar de 44px. Animação `transform/opacity` barata; `prefers-reduced-motion` já
  neutraliza (bloco global do `index.css`).
- Conteúdo **reaproveitado** sem duplicar markup: a busca virou a variável `controlesBusca` (usada no
  painel desktop e na folha) e o clima virou `ConteudoClima` (usado no widget desktop e na folha).
  Buscar com sucesso fecha a folha para revelar o resultado no mapa.
  - Radix Dialog: https://www.radix-ui.com/primitives/docs/components/dialog
  - Peso: o Radix Dialog entra **só no chunk lazy do `/mapa`** (+~11 KB gzip); o caminho de
    login/público não é afetado. Trade-off assumido em troca de a11y correta nas folhas.

## 3. Mapa: limites de região (`src/features/mapa/cores.ts`, `src/pages/mapa.tsx`, `src/features/hortas/seletor-local.tsx`)

- `maxBounds` (caixa de Santa Maria/RS + margem), `maxBoundsViscosity={1}`, `minZoom={10}` e
  `maxZoom={18}` no `TileLayer`. Evita pan/zoom para fora da região e o download de tiles do mundo
  todo — **economia direta de dados** no 3G. Aplicado nos dois mapas (público e cadastro de horta).
  - Opções do `L.Map` (`maxBounds`, `minZoom`): https://leafletjs.com/reference.html#map-maxbounds
  - `MapContainer` repassa opções do Leaflet como props: https://react-leaflet.js.org/docs/api-map/#mapcontainer

## Bundle (antes → depois, gzip)

- Caminho inicial (login/público): `index` 9,40 → **7,75 KB** (igual-ou-menor); framework intocado.
- `painel-layout` (lazy, pós-login): 0,80 → 1,50 KB (bottom nav).
- `mapa` (lazy, só ao abrir o mapa): 4,66 → 15,59 KB (Radix Dialog das folhas).

## Desktop preservado

- Bottom nav some no `md:` (home em grade continua a navegação no desktop).
- Painéis flutuantes do mapa intactos no `md:`; folhas só no mobile.
- `maxBounds`/zoom valem para ambos (a região é a mesma).
