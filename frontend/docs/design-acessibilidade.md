# Frontend — Parte 1: Design e Acessibilidade

Registro das mudanças de design/acessibilidade e das fontes oficiais que as fundamentam.
Público-alvo: baixa escolaridade, pouca familiaridade com tecnologia, Android antigo, 3G instável.
Direção: pixel/retrô na "moldura"; sans legível e alto contraste no conteúdo que se lê para agir.

## Sistema de design (`src/index.css`)

- **Token de contraste** `--color-hu-muted` (`#d4efdf`) para texto secundário, com contraste AA
  (≥4.5:1) sobre `hu-panel` e `hu-bg` — resolve o "verde-sobre-verde" e os cinzas de baixo contraste.
  Toda ocorrência de `text-white/40|50|60|70` virou `text-hu-muted`.
  - Tailwind v4 `@theme` / namespace `--color-*` gera utilitários: https://tailwindcss.com/docs/theme
  - Contraste mínimo (WCAG 1.4.3 AA): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- **Placeholders** com contraste suficiente (regra global `::placeholder` + utilitário por campo).
- **Fontes mais leves**: só o subset `latin` da Press Start 2P e o eixo de peso da Geist
  (`wght.css`, sem itálico). `font-display: swap` já vem do Fontsource. Removido `tw-animate-css`
  (não utilizado). Em runtime só baixam os woff2 latinos (via `unicode-range`).
  - Fontsource: https://fontsource.org/docs/getting-started/introduction
  - `font-display`: https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display
- **Movimento barato e respeitando preferências**: `hu-pulse` passou de `box-shadow` (repaint) para
  `transform/opacity`; novo `hu-spin` (transform) para o loader. Bloco `prefers-reduced-motion` mantido.
  - https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

## Alvos de toque (WCAG 2.2 SC 2.5.8 AA = 24px; aqui miramos 44–48px)

- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- `Button` (variantes) e `Input` (48px) redimensionados; `Label` 16px.
- Botões só-ícone destrutivos/fechar (excluir membro/canteiro/demanda, fechar form) viraram quadrados 44px.
- Botão "Sair" do cabeçalho elevado para 44px.

## Feedback (`src/components/feedback.tsx`)

- `Aviso` (erro/sucesso/info): cor + ícone + frase curta; botão "Tentar de novo" opcional
  (`aoTentarNovamente`). `role="alert"`/`role="status"`. Substitui as "paredes" de texto vermelho.
- `Carregando`: spinner leve + texto, `role="status"` `aria-live="polite"`.
- Telas de membro agora tratam **erro de carga** (3G) com `Aviso` + "Tentar de novo", em vez de
  cair no estado vazio "você não tem canteiro".

## index.html

- **Splash inline** (spinner CSS) dentro de `#root` — feedback imediato no 3G antes do JS carregar;
  o React substitui ao montar. Respeita `prefers-reduced-motion`.
- Favicon on-brand (broto) no lugar do ícone roxo de template; `icons.svg` (template) removido.
- `meta description`, `viewport-fit=cover`. Zoom do usuário mantido (não desativar — acessibilidade).

## Login (`src/pages/login.tsx`)

- Máscara de CPF (`inputMode="numeric"`, formata na tela, envia só dígitos), autofoco no e-mail,
  botões de limpar campo. CPF fica visível (sem ocultar): este público precisa conferir os números.
- Conexão mantida automaticamente (sem checkbox; relogar é barreira para o público).
- Erro amigável em PT-BR por status (401 = "E-mail ou CPF não conferem"), sem código cru.
  - `inputmode`: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode
  - `ref` como prop (React 19): https://react.dev/blog/2024/12/05/react-19#ref-as-a-prop

## Toque em vez de digitar

- Cadastro de horta: UF virou seleção (toque) em vez de campo livre.
- Instruções do "Plantar" (Passo) em fonte legível (sans), mantendo só o número em pixel.
