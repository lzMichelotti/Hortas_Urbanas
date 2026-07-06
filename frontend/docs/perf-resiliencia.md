# Frontend — Parte 2: Performance e Resiliência

Registro das mudanças de performance/resiliência e das fontes oficiais que as fundamentam.
Público-alvo: Android antigo, pouca RAM, 3G instável. Foco: app leve, que abre rápido,
sobrevive à internet caindo e nunca quebra a tela inteira.

## Antes / depois do bundle

Medido com `npm run build` (Vite 8 / Rolldown). "Inicial" = o que a rota de login (`/`) baixa
de fato (entry + chunks com `modulepreload` no `index.html`).

### Caminho inicial (login)

| | Antes | Depois |
|---|---|---|
| JS inicial (gzip) | ~105 KB num entry monolítico de 232 KB + 2 chunks compartilhados | ~108 KB divididos em 6 chunks cacheáveis (`react` 57,2 · `query` 14,8 · `router` 14,7 · `errors` 12,0 · `index` 9,4 · runtime 0,4) |
| CSS inicial (gzip) | 7,8 KB | 7,9 KB |
| Logo na 1ª pintura | **187 KB** (`logo.png` 534px) | **13 KB** (256px, paleta) |
| Fontes em runtime | só subset latino (woff2) | igual |

O JS inicial é dominado pelo framework (React + Router + Query ≈ 87 KB gzip) e por isso **não
encolhe** sem cortar recursos. O ganho real do caminho inicial foi a **imagem** e a **divisão em
chunks estáveis** (ver "Cache de chunks").

**Transferência da 1ª tela (login), na prática:**
~312 KB (antes) → **~141 KB** na primeira visita; **~instantâneo** nas próximas (service worker).

### Por rota / sob demanda

- **Mapa / Leaflet**: continua **lazy** — `gps-*.js` 155,9 KB (45,9 KB gzip) só baixa ao abrir
  `/mapa` ou o cadastro de horta. Confirmado: não aparece nos `modulepreload` da home.
- Demais rotas do painel: chunks de 0,3–4 KB gzip, carregados ao navegar (e depois servidos do
  cache do SW).

## Mudanças e por quê

### 1. Imagens (`public/`)
- `logo.png` 187 KB → **13 KB**: redimensionado de 534px para 256px (tamanho máximo de exibição
  é 112px) e quantizado em paleta. Mesma arte; só peso. É o maior ativo da 1ª pintura do login.
- Gerados `pwa-192x192.png` (9 KB), `pwa-512x512.png` (38 KB) e `pwa-maskable-512x512.png`
  (27 KB) para o manifesto/instalação no Android.
- Doc: tamanho/resolução de imagem — https://web.dev/articles/serve-responsive-images

### 2. Cache e dados (TanStack Query v5) — `src/lib/query.ts`
- `staleTime` padrão **5 min** (era 30 s) e `gcTime` **24 h**: reaproveita o cache, evita refetch
  à toa no 3G. `gcTime` ≥ `maxAge` do persister (exigência da doc).
- `retry`: até 3 tentativas, **pulando 4xx**; `retryDelay` com **backoff exponencial + jitter**
  (cap 30 s) para não martelar o servidor em rede ruim.
- Mutations **não** têm retry automático (POSTs como colher/plantar/demanda não são idempotentes —
  ver "Precisa do backend").
- Doc: https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
  e https://tanstack.com/query/latest/docs/framework/react/guides/query-retries

### 3. Persistência do cache (offline-first) — `src/lib/query.ts`, `src/main.tsx`
- `PersistQueryClientProvider` + `createAsyncStoragePersister` (localStorage): os dados já
  carregados **sobrevivem ao fechar o app** e aparecem na hora (stale-while-revalidate) na próxima
  abertura, mesmo sem rede.
- Persister **assíncrono** (não bloqueia a thread principal — melhor em CPU fraca); o sync está
  deprecado na própria lib.
- `onSuccess` → `resumePausedMutations()`: reenvia escritas que ficaram pausadas offline.
- Cache limpo no logout (`persister.removeClient()`) — `src/features/auth/use-logout.ts` — para não
  vazar dados entre usuários no mesmo aparelho.
- Doc: https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient

### 4. PWA / service worker — `vite.config.ts`, `src/components/conexao.tsx`, `src/vite-env.d.ts`
- `vite-plugin-pwa` (Workbox, `generateSW`, `registerType: "autoUpdate"`).
- **Precache do app-shell** (JS/CSS/HTML/ícones/fonte latina): abertura instantânea e funcionamento
  offline nas próximas vezes. 48 itens / 772 KiB.
- **Não precacheia** os subsets de fonte não usados (cyrillic/vietnamese/latin-ext via
  `unicode-range`) — economiza ~47 KB no primeiro acesso.
- **Tiles do mapa** (carto): `CacheFirst` com expiração (30 dias / 300 tiles) — mapa navegável
  offline depois de visto.
- **API não é cacheada pelo SW** (evita servir dado autenticado/obsoleto a outro usuário); quem
  cuida do dado é o TanStack Query.
- Banner de atualização ("tem versão nova") via `virtual:pwa-register/react`.
- Doc: https://vite-pwa-org.netlify.app/frameworks/react

### 5. Status de conexão — `src/components/conexao.tsx`
- Banner simples e amigável: **"Sem internet — mostrando o que já foi salvo."**
- Contador de **envios pendentes** (mutations pausadas offline) — "vamos enviar quando a internet
  voltar". Lê `onlineManager` via `useSyncExternalStore` e as mutations via `useMutationState`.
- Doc: https://tanstack.com/query/latest/docs/framework/react/guides/network-mode

### 6. Robustez — `src/components/error-boundary.tsx`, `src/components/painel-layout.tsx`
- `ErrorBoundary` por rota (`RouteBoundary`): um erro numa tela do painel mostra um aviso só na
  área de conteúdo, **sem derrubar o cabeçalho/menu**, e **reseta sozinho ao navegar** (resetKey =
  pathname). Mantido o boundary raiz como última proteção.
- Suspense próprio do conteúdo do painel: ao trocar de tela aparece o loader leve só na área certa.

### 7. Resiliência de carregamento de chunk — `src/lib/lazy.ts`
- `lazyComRetry`: o `import()` dinâmico tenta de novo (3x, espera crescente) se a 1ª busca do
  chunk falhar — comum em 3G na primeira visita (antes do SW ter o chunk em cache).

### 8. Cache de chunks (atualizações baratas) — `vite.config.ts`
- `manualChunks` separa `react`, `react-router` e `@tanstack` em chunks de vendor estáveis. Não
  reduz o tamanho inicial, mas: ao publicar uma correção, **só o chunk do app muda**; React/Router/
  Query continuam no cache do navegador e do SW. Importa muito para quem volta pelo 3G.
- Doc: https://rollupjs.org/configuration-options/#output-manualchunks

## O que NÃO foi feito (de propósito)

- **Virtualização de listas**: a maior lista é o catálogo (67 produtos); as demais são ~10 hortas /
  poucos membros. Virtualizar agora seria dependência nova e complexidade sem ganho medido (YAGNI).
  Reavaliar se alguma lista passar de ~150–200 itens (aí `@tanstack/react-virtual`).
- **Prefetch agressivo de dados/rotas no login**: baixar painel antes do login gastaria dados de
  quem nem entra. As rotas já ficam no precache do SW após a 1ª visita; as queries da home já
  rodam em paralelo (sem cascata) e o TanStack deduplica chaves iguais.

## Precisa do backend (descrito, NÃO executado)

1. **Idempotency-Key nas escritas** (POST de colher/plantar/criar demanda/solicitação). Sem isso,
   reenviar uma escrita que talvez tenha dado certo antes da rede cair pode **duplicar** o registro.
   Com chave de idempotência dá para: (a) ativar retry de mutation com backoff e (b) implementar
   fila offline que reenvia após reabrir o app. Hoje, escritas offline só reenviam **na mesma
   sessão** (quando a rede volta sem fechar o app).
2. **ETag / Cache-Control nos GET** de listagem (hortas, demandas, produtos, membros). Permitiria
   revalidação condicional barata (304) no 3G em vez de rebaixar o corpo inteiro.
3. **Paginação/limite nos endpoints de listagem** — só se as listas crescerem. Hoje o volume é
   pequeno (YAGNI); fica como gatilho futuro.

(Compressão de resposta já existe no backend — `GZipMiddleware` — então não entra aqui.)

## Dependências novas

| Pacote | Tipo | Por quê |
|---|---|---|
| `@tanstack/react-query-persist-client@5.101.0` | runtime | Persistir o cache de queries (req. "persistir cache para sobreviver ao fechar"). Oficial, casado com `react-query@5.101.0`. |
| `@tanstack/query-async-storage-persister@5.101.0` | runtime | Persister assíncrono (não bloqueia a thread; o sync está deprecado). |
| `vite-plugin-pwa@1.3.0` | dev | Service worker + manifesto (Workbox). v1.3.0 já declara suporte ao Vite 8. Só build-time. |
| `workbox-window` | dev | Exigido pelo `virtual:pwa-register/react` para registrar/atualizar o SW; gera ~2,2 KB gzip carregados após a 1ª pintura. |
