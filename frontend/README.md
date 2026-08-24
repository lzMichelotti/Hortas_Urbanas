# Hortas Urbanas — frontend

React 19 + Vite + TypeScript. Mesmo código roda como PWA e, via Capacitor, como app
Android.

Para visão geral do projeto, arquitetura e decisões técnicas, veja o
[README na raiz](../README.md).

## Desenvolvimento

```bash
npm install
npm run dev            # http://localhost:5173
```

A API precisa estar rodando em `localhost:8000` (ver README da raiz).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Type-check (`tsc -b`) + build de produção |
| `npm run preview` | Serve o build localmente |
| `npm run lint` | ESLint |
| `npm run gen:api` | Regenera `src/lib/api/schema.d.ts` a partir do OpenAPI da API |

## Organização

```
src/
├── features/       # por domínio: auth, hortas, canteiros, ciclos, forum, mapa...
├── components/     # UI compartilhada (shadcn/ui)
├── lib/            # cliente HTTP tipado, query client, helpers
├── pages/          # rotas
└── assets/         # arte (flat e pixel) e ícones
```

## Android

```bash
npm run build
npx cap sync android
npx cap open android    # abre no Android Studio
```

## Notas

- Os tipos da API são **gerados**, não escritos à mão. Depois de mudar um endpoint no
  backend, rode `npm run gen:api`.
- Leaflet é carregado sob demanda (lazy) — o mapa não pesa no bundle inicial de quem
  nunca abre o mapa.
- O service worker **não** cacheia respostas da API; o cache de dados é responsabilidade
  do TanStack Query, com persistência controlada por allowlist.
