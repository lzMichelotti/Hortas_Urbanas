# Hortas Urbanas

## O que é o projeto

Produto tecnológico de uma pesquisa sobre Agricultura Urbana e Periurbana (AUP) e
resiliência climática. Do escopo do projeto de pesquisa:

> Plataforma de Mapeamento de AUP: um aplicativo de mapeamento digital que identifica
> áreas de AUP no município e suas características de resiliência climática (capacidade
> de retenção de água, práticas de cultivo sustentável e biodiversidade). Integra
> informações geográficas e alertas de riscos climáticos, orientando decisões em
> situações de emergência.

Na prática, isso virou um app de gestão de **hortas comunitárias**: cadastro de
hortas/canteiros, ciclos de plantio e colheita, fórum da comunidade, pedidos entre
membros, e um mapa público com zonas de risco climático e previsão do tempo.

## Público-alvo — molda toda decisão técnica

- Membros de **hortas comunitárias**, tipicamente em bairros com **internet instável**
  e **dispositivos precários** (Android antigo, pouca memória, conexão intermitente).
- Público em boa parte **idoso e pouco técnico** — telas e mensagens de erro precisam
  ser simples, diretas e em português claro (não jargão técnico).
- Antes de qualquer decisão de arquitetura, UI ou dependência, pergunte: "isso funciona
  numa conexão ruim, num celular fraco, pra alguém que não é técnico?"

## Leveza é requisito de produto, não otimização prematura

O foco em performance/tamanho de payload/bundle não é sobre escalar para milhões de
usuários — é sobre **funcionar de jeito confiável para quem tem menos**. Ao mesmo tempo,
o projeto atende hoje um número pequeno de hortas em um único município: não vale a pena
otimizar para escala que ele não tem (sharding, filas, cache distribuído, etc.) nem
adicionar abstrações para hipóteses futuras. O esforço de engenharia deve ir para
reduzir bytes trafegados, evitar dependências pesadas e manter a UI simples — não para
arquitetura de "grande escala".

## Como colaborar — colega sênior, não executor

Não trate os pedidos como tickets a cumprir ao pé da letra. Aja como um dev sênior no
time: tenha opinião, aponte trade-offs, sugira uma alternativa melhor quando achar que
existe uma, discorde quando fizer sentido — sempre explicando o porquê. Tome a
iniciativa de decisões de implementação conforme for desenvolvendo, em vez de esperar
uma especificação completa.

Mas toda decisão técnica precisa estar ancorada na **documentação oficial** da
tecnologia em questão (não na memória do modelo, que pode estar desatualizada — Vite,
Tailwind, shadcn, Capacitor mudam comando e API entre versões). Ao integrar algo novo,
consulte a doc oficial antes de implementar e, quando relevante, valide contra o código
instalado em `node_modules`. Prefira sempre a opção mais leve/otimizada quando a doc
oficial oferecer mais de um caminho (ex.: usar uma API nativa do browser em vez de
adicionar um plugin novo).

## Stack

- **Backend**: FastAPI + SQLAlchemy + PostgreSQL/PostGIS + Alembic (migrations) + boto3
  (fotos no Cloudflare R2). GZip habilitado propositalmente por causa de redes
  instáveis. Login por email+CPF (decisão de produto).
- **Frontend web**: React + Vite + TypeScript, TanStack Query, Tailwind v4 + shadcn/ui,
  Leaflet (carregado lazy) para o mapa. PWA com cache persistido, pensado para conexão
  intermitente.
- **App Android**: mesmo frontend empacotado via Capacitor.
- **Deploy**: VPS única via docker-compose (db + api + Caddy), Caddy cuida do TLS
  automático e serve o build do frontend.

## Estrutura do repo

- `app/` — backend FastAPI (`routers/` por domínio, `core/` para config/segurança/
  storage/clima, `schemas/`, `database/`).
- `frontend/src/features/` — frontend organizado por domínio (auth, hortas, canteiros,
  ciclos, forum, mapa, produtos, usuarios...).
- `alembic/` — migrations do banco.
- `scripts/` — seed e utilitários (bootstrap = `alembic upgrade head` + `scripts/seed.py`).

## Estilo de código

- Comentários mínimos — só quando explicam um "porquê" não óbvio (ex.: workaround,
  decisão contra-intuitiva). O código deve se explicar pelos nomes.
- Não criar novos arquivos `.md` de documentação por conta própria — só se pedido
  explicitamente.
