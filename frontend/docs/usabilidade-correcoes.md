# Frontend — Parte 4: Correções de usabilidade e acessibilidade

Mudanças feitas a partir da auditoria de UX (heurísticas de Nielsen + WCAG 2.2), com as
fontes oficiais que as fundamentam. Público-alvo: celulares modestos, 3G instável, baixa
familiaridade digital, idades variadas, baixa visão. Princípio: corrigir sem adicionar peso
relevante (todas as mudanças usam libs já presentes; nenhuma dependência nova).

## A1. Confirmação em ações destrutivas (`src/components/confirmar.tsx`)

- **Problema:** remover membro, excluir canteiro e marcar "Perdeu-se" disparavam direto no
  toque, sem confirmar — e de forma **inconsistente** (excluir usuário/horta já confirmavam).
- **Solução:** `ConfirmacaoInline` reusável (inline, não modal: mais leve, sem portal/focus-trap)
  aplicado em `membros.tsx` (membro/canteiro), `calendario.tsx` ("Perdeu-se") e `demandas.tsx`.
  `role="alert"` para anunciar a pergunta ao surgir.
- Nielsen #5 (prevenção de erros), #3 (controle/liberdade), #4 (consistência); WCAG **3.3.4**.
  - https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-all.html
  - 10 heurísticas: https://www.nngroup.com/articles/ten-usability-heuristics/

## A2. Contraste verde-sobre-verde (vários)

- **Problema:** `hu-bright` (#4ccc6f) como **texto** sobre `hu-panel` (#00763e) = **2,78:1** (reprova
  WCAG 1.4.3 AA). Atingia dados a ler: CPF/"senha de acesso" do novo membro, "Colheita prevista",
  nome de canteiro, "em andamento", nome da horta.
- **Solução:** esses textos passaram a branco (5,74:1) / `hu-muted` (4,70:1), **sem mexer na paleta**.
  O verde foi mantido onde passa (ex.: caixa de época/dias do Plantar, fundo mais escuro = 5,05:1) e
  em ícones (objeto gráfico, critério 3:1).
- WCAG **1.4.3 Contraste mínimo (AA)**: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html

## A3. Ajuda de acesso no login (`src/pages/login.tsx`)

- **Problema:** quem nunca entrou não tinha saída; o link do mapa era uma plaquinha pixel de baixa
  descoberta.
- **Solução:** `<details>`/`<summary>` nativo (zero JS, acessível) "Como faço para entrar?" explicando
  que o acesso vem do líder (e-mail + CPF). Link do mapa ganhou legenda legível "Ver hortas no mapa
  (sem entrar)" e alvo maior.
- Nielsen #10 (ajuda/documentação); `<details>` nativo:
  https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details

## M1. Fonte pixel nunca abaixo de 12px (vários)

- **Decisão de produto:** manter a identidade retrô, mas a Press Start 2P **nunca abaixo de 12px** e
  nunca em instrução/dado. Todos os `font-pixel text-[10px]/[11px]` viraram `font-pixel text-xs` (12px).
  O `text-[11px]` **sans** do menu inferior foi preservado.
- WCAG **1.4.4 Redimensionar texto** / legibilidade:
  https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html

## M2. Botão que diz o que falta (`plantar.tsx`, `cadastro-horta.tsx`)

- **Problema:** botão `disabled` cinza, sem dizer por quê (becos sem saída; `disabled` não é anunciado).
- **Solução:** botão fica habilitado; ao tentar enviar incompleto, mostra um `Aviso` listando o que
  falta ("Para plantar, falta escolher o que plantar · dizer quantas"). Nielsen #1 (visibilidade do status).
  - Anti-padrão do `disabled`: https://developer.mozilla.org/en-US/docs/Web/Accessibility

## M3. Status do mapa no mobile (`mapa.tsx`)

- **Problema:** contagem/"carregando hortas…"/erro eram `sm:inline` → invisíveis no celular.
- **Solução:** chip compacto `sm:hidden` sempre visível (spinner / "erro — recarregue" / "N hortas"),
  com `role="status" aria-live="polite"`. Nielsen #1.

## M4. Mapa: cor + símbolo (`features/mapa/icone-horta.ts`, `mapa.tsx`)

- **Problema:** situação diferenciada só pela cor do marcador (daltônicos).
- **Solução:** selo com símbolo redundante à cor (`i` monitoramento, `!` alerta, `‼` em risco/emergência)
  no marcador e na legenda. WCAG **1.4.1 Uso de cor**:
  https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html

## M5. Desfazer etapa do ciclo (`calendario.tsx`)

- **Problema:** avançar status era irreversível (toque errado sem volta).
- **Solução:** botão "Voltar etapa" reverte um passo (PRONTO→CRESCENDO→PLANTADO). Nielsen #3.

## M6. Linguagem (`home.tsx`, `comunidade.tsx`, `mapa.tsx`)

- "Meus Pedidos" → **"Pedidos"** (consistente com o menu). Popup público do mapa perdeu o jargão
  "Biodiv./índice de biodiversidade". Nielsen #2 (mundo real), #4 (consistência).

## M7. Alvos de toque ≥44px (`comunidade.tsx`, `membros.tsx`, `mapa.tsx`)

- "Cancelar"/"Responsável" pequenos viraram `min-h-11`. O raio do mapa ganhou **atalhos** (1/2/5/10 km)
  além do slider. WCAG **2.5.8 Tamanho do alvo**:
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

## B1. Voltar contextual (`src/components/voltar.tsx`)

- Volta no histórico (`navigate(-1)`) quando há entrada anterior (`location.key !== "default"`); senão
  vai para `/painel`. Respeita o alerta da doc do RR de não usar `navigate(número)` sem histórico.
  - https://reactrouter.com/api/hooks/useNavigate

## B2. Abas acessíveis (`comunidade.tsx`, `solicitacoes.tsx`)

- `role="tab"` manual (sem tabpanel/setas) → **Radix Tabs** (`radix-ui`, já presente): roles corretos,
  setas/Home/End, `aria-controls`. Peso ~nulo (o `radix-ui` já estava no bundle). WCAG **4.1.2**.
  - https://www.radix-ui.com/primitives/docs/components/tabs

## B3/B5. Esqueleto da home + vermelho legível

- `ResumoSkeleton` reserva a altura enquanto o resumo carrega (evita o "pulo"/CLS).
- `text-red-300` (3,02:1) → `text-red-200` (3,96:1) nos textos destrutivos pequenos.

## Peso (build, gzip)

- Caminho inicial (login): `index` 7,98 → **8,37 KB** (+ajuda no login e legenda do mapa); framework intocado.
- Novo chunk `confirmar`: **0,46 KB** (compartilhado por membros/calendário/demandas).
- Abas Radix: comunidade/solicitações ~flat (Radix já no bundle). Mapa e Leaflet (lazy) inalterados.
