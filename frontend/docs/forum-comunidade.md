# Fórum da comunidade

Feed único (todas as hortas juntas) para os membros se ajudarem. **Ler é público; postar/responder/denunciar exige login.** A interface é **um feed só, sem categorias** — a coluna `tipo` existe no banco (default `AJUDA`) reservada para uso futuro, mas não aparece na UI. Imagem fica para a Fase 2 (a coluna `imagem_path` já existe, sem uso).

## Backend

- **Modelos** (`app/database/models.py`): `Post`, `Resposta` (1 nível), `Denuncia`. Exclusão é **hard-delete**: apagar um post remove em cascata (`ON DELETE CASCADE`) suas respostas e as denúncias do alvo. `Post.tipo` (`TipoPost`: AJUDA/TROCAS/AVISOS, default AJUDA) com `CHECK` + índice composto `(tipo, id)` para o feed filtrado por tipo (keyset). `Post.imagem_path` nullable e sem uso (Fase 2).
- **Migrations**: `b2c3d4e5f6a7` (tabelas) e `c3d4e5f6a7b8` (coluna `tipo`).
- **Schemas** (`app/schemas/forum.py`): entrada com `conteudo` 1..2000 (trim + rejeita vazio) + `tipo`; saída `PostRead`/`PostDetalhe` com `tipo` e `autor.{nome, horta}` (horta = horta do autor), `FeedRead` (`items` + `proximo_cursor`).
- **Rotas** (`app/routers/forum.py`, prefixo `/forum`):
  - `GET /forum/posts?cursor=&limit=&tipo=` — público, mais recentes primeiro, **paginação por cursor (keyset em `id` desc)**, filtro opcional por `tipo`.
  - `GET /forum/posts/{id}` — público, post + respostas.
  - `POST /forum/posts` · `POST /forum/posts/{id}/respostas` — login.
  - `DELETE /forum/posts/{id}` · `DELETE /forum/respostas/{id}` — **dono ou moderador** (`exigir_dono_ou_moderador`, moderador = `LIDER_HORTA`/`ADMIN_SUPREMO`).
  - `POST /forum/posts/{id}/denuncia` · `POST /forum/respostas/{id}/denuncia` — login.

## Frontend

- **Rotas públicas** (fora do `ProtectedRoute`, lazy): `/forum` (feed) e `/forum/:id` (post). Entrada "Comunidade" no nav inferior dos logados; visitante anônimo lê e vê convite para entrar.
- **Layout do feed** (`src/pages/forum.tsx`): coluna `h-svh` → cabeçalho fixo, lista rolável (`flex-1 overflow-y-auto`) e **barra de postar fixa no rodapé** (estilo mensageiro: textarea + botão enviar). Deslogado: rodapé mostra "Entre para postar". Sem filtros/categorias (decisão de simplificar — "menos informação, só as postagens").
- **Cards** (`features/forum/ui.tsx` = só `Avatar`): avatar (ícone `Sprout`) + nome + horta + tempo + texto + nº de respostas + "Responder". Espaço de imagem (Fase 2) já previsto via `{post.imagem_path && <img/>}` (hoje sempre null).
- **Hooks** (`src/features/forum/use-forum.ts`): `useFeed` (`useInfiniteQuery`, cursor), `usePost`, mutations de postar/responder/apagar/denunciar invalidando feed/post. `useCriarPost` injeta `tipo: "AJUDA"` (default oculto) já que o tipo saiu da UI.
- **Leve/seguro**: **texto puro** (`whitespace-pre-wrap`, React escapa → sem XSS); rotas lazy (feed ~2,3 kB / post ~2,7 kB gzip); "Carregar mais" explícito; tempo relativo via `Intl.RelativeTimeFormat` (`src/lib/tempo.ts`, sem dep nova); alvos de toque ≥ 44px.

## Fase 2 (não feito)

Imagem nos posts usará a coluna `imagem_path` já criada (sem migration nova) + upload com compressão/EXIF/thumbnail (Pillow) servida pela VPS. O slot no card já existe.

## Docs oficiais consultadas

- FastAPI — APIRouter, dependências, `Query` (validação/paginação/filtro Enum).
- Pydantic v2 — `field_validator`, `ConfigDict(from_attributes=True)`, campo Enum.
- SQLAlchemy 2.0 — mapeamento, `ForeignKey(ondelete=...)`, `CheckConstraint`, `Index` composto (btree lido em ordem reversa p/ `ORDER BY id DESC`); PostgreSQL `num_nonnulls`.
- PostgreSQL — `ALTER TABLE ADD COLUMN ... DEFAULT` com default constante é **metadata-only** (não reescreve a tabela).
- Alembic — `op.add_column` / `create_check_constraint` / `create_index`.
- TanStack Query v5 — `useInfiniteQuery` (`initialPageParam` / `getNextPageParam`).
- openapi-typescript / openapi-fetch — geração e consumo dos tipos.
- React Router v7 — rotas e `useParams`.
