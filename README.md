<h1 align="center">🌱 Hortas Urbanas</h1>

<p align="center">
  <strong>Plataforma de gestão de hortas comunitárias urbanas.</strong><br>
  Aplicativo Android + PWA construído para funcionar em celular fraco e internet instável.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" alt="Python 3.12">
  <img src="https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/PostgreSQL-15%20+%20PostGIS-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL + PostGIS">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white" alt="Capacitor">
</p>

<p align="center">
  <img src="docs/screenshots/01-home.jpg" width="30%" alt="Tela inicial: a horta como cena interativa">
  <img src="docs/screenshots/02-canteiro.jpg" width="30%" alt="Canteiro com os ciclos de plantio em andamento">
  <img src="docs/screenshots/03-mapa.jpg" width="30%" alt="Mapa público com busca por raio">
</p>
<p align="center">
  <sub>A horta como cena · o canteiro do membro · busca de hortas por raio no mapa</sub>
</p>

---

## Sobre o projeto

Este é o produto tecnológico de uma pesquisa sobre **Agricultura Urbana e Periurbana (AUP)
e resiliência climática**, desenvolvido para as hortas comunitárias de Santa Maria (RS).

O aplicativo cobre a **gestão do dia a dia da horta**: cadastro de hortas e canteiros,
acompanhamento dos ciclos de plantio até a colheita, fórum entre os membros, pedidos de
mudas e insumos, e um mapa público das hortas com previsão do tempo.

O escopo da pesquisa prevê ainda uma camada de **mapeamento de resiliência climática** —
capacidade de retenção de água, práticas de cultivo sustentável e zonas de risco. Essa
camada já está construída no backend (consultas espaciais com PostGIS, zonas de risco e
alertas, cobertas por teste), mas ficou **fora do primeiro lançamento** por decisão de
prioridade: o que faz o horticultor abrir o app toda semana é a gestão, e ferramenta que
ninguém usa não produz dado nenhum. Primeiro o uso, depois a análise por cima dele.

E o dado que a pesquisa busca sai naturalmente desse uso: quando um ciclo se perde, o
motivo é registrado, e os motivos climáticos (geada, seca, chuva em excesso, calor) são
[um recorte explícito no domínio](app/database/enums.py). Gestão do dia a dia para o
horticultor, série histórica de perdas climáticas para a pesquisa.

### O usuário define a engenharia

Este não é um projeto onde "otimizar" foi enfeite. O público-alvo são membros de hortas
comunitárias, em boa parte **idosos e pouco técnicos**, em bairros com **internet
intermitente** e **aparelhos Android antigos**.

Isso é uma restrição de engenharia real, e cada decisão técnica abaixo responde a ela.
Não se trata de escalar para milhões de usuários — o sistema atende as hortas
comunitárias de um único município. Trata-se de **funcionar de forma confiável para quem
tem menos**: menos banda, menos memória, menos familiaridade com tecnologia.

## Status

> **Em preparação para produção — lançamento previsto para agosto de 2026.**
>
> A infraestrutura está pronta e reproduzível (`docker compose up`), com TLS automático,
> migrations versionadas e healthchecks. O sistema ainda **não** está aberto ao público.
>
> O primeiro lançamento entrega a **gestão das hortas**. A camada de risco climático já
> está implementada e será ativada em seguida.

<!-- TODO(deploy): quando estiver no ar, descomentar
| | |
|---|---|
| 🗺️ Mapa público | https://app.hortasurbanassm.com.br/mapa |
| 📖 Documentação da API | https://api.hortasurbanassm.com.br/docs |
| 📱 APK Android | ver [Releases](../../releases) |
-->

## Funcionalidades

| Domínio | O que faz |
|---|---|
| **Hortas e canteiros** | Cadastro com geolocalização, fonte de água, tipo de solo, práticas de cultivo e nível de vulnerabilidade. Cada horta se divide em canteiros atribuídos a membros. |
| **Ciclos de plantio** | Do plantio à colheita, com estimativa de data e registro de perdas por motivo (incluindo o recorte climático da pesquisa). |
| **Avisos de colheita** | Notificação **local** agendada no aparelho (não push) avisando quando a cultura está crescendo e quando chega o dia de colher — funciona sem rede. |
| **Fórum da comunidade** | Feed único público para ajuda, trocas e avisos, com fotos. |
| **Pedidos entre membros** | Solicitações de produtos entre horticultores, com fluxo de status e encaminhamento. |
| **Mapa público** | Hortas do município, busca por raio e previsão do tempo — **sem exigir login**. |
| **Painel administrativo** | Visão do município: números por horta e gestão de usuários. |

Construído e coberto por teste, mas **fora do primeiro lançamento**: zonas de risco
climático (alagamento, enxurrada, erosão, deslizamento) e alertas para hortas dentro de
área de risco.

Perfis de acesso: `ADMIN_SUPREMO` (município), `LIDER_HORTA` (uma horta) e
`MEMBRO_CANTEIRO` (o próprio canteiro).

## Arquitetura

```mermaid
flowchart TB
    A["📱 App Android<br/>(Capacitor)"]
    B["🌐 PWA / navegador"]
    C{"Caddy<br/>TLS automático"}

    A --> C
    B --> C

    C -->|"app.*"| D["Build Vite<br/>React + TS (estáticos)"]
    C -->|"api.*"| E["FastAPI + uvicorn"]

    E --> F[("PostgreSQL 15<br/>+ PostGIS 3.5")]
    E -.->|"gera presigned URL"| G[("Cloudflare R2<br/>fotos")]
    E -.->|"cache em memória"| H["Open-Meteo<br/>previsão do tempo"]

    A -.->|"upload direto (PUT)"| G
    B -.->|"upload direto (PUT)"| G
```

Uma VPS única roda tudo via `docker-compose`: banco, API e Caddy numa rede interna. Só o
Caddy publica portas para a internet — o Postgres não é exposto, e a API só é alcançável
pelo proxy. O mesmo código do frontend vira PWA e APK Android via Capacitor.

## Decisões de engenharia

Esta é a parte do projeto que eu mais recomendo olhar. Cada item é uma restrição real do
usuário virando código.

### 1. Idempotência para sobreviver a reenvios

**Problema:** em rede instável, a conexão cai depois do servidor processar o POST mas
antes da resposta chegar. O usuário toca "salvar" de novo e cria um registro duplicado.

**Decisão:** endpoints de criação aceitam um header `Idempotency-Key` (UUID validado pelo
FastAPI). A chave tem UNIQUE no banco; quando o `IntegrityError` chega pela constraint de
idempotência, o servidor identifica a violação pelo nome da constraint e devolve o
registro que já existia, em vez de erro.

**Trade-off:** o cliente pode omitir o header — aí o comportamento é o de um commit
normal, sem detecção de duplicata. Deixei explícito que isso é escolha do cliente, não
falha silenciosa.

📄 [`app/core/idempotency.py`](app/core/idempotency.py)

### 2. Cada byte na rede é decisão consciente

**Problema:** listas re-baixadas inteiras a cada abertura de tela consomem a franquia de
quem está em 3G ruim.

**Decisão:** três camadas complementares — `ETag` fraco + `304 Not Modified` nas rotas de
leitura, `GZipMiddleware` a partir de 500 bytes, e cache persistido no cliente com
TanStack Query.

O ETag é gerado como hash do payload **serializado**, não da resposta comprimida — assim
um cliente que aceita gzip e outro que não aceita recebem bytes diferentes com o mesmo
ETag fraco, que é o comportamento correto da especificação.

**Trade-off:** hash do payload a cada request custa CPU. Na escala deste projeto, é
irrelevante perto da banda economizada.

📄 [`app/core/http.py`](app/core/http.py) · [`app/main.py:23`](app/main.py#L23)

### 3. Geometria processada no banco, não no cliente

**Problema:** polígonos de zonas de risco em GeoJSON cru são pesados demais para um
Android antigo renderizar — e para a rede entregar.

**Decisão:** `ST_SimplifyPreserveTopology` + `ST_AsGeoJSON` com 5 casas decimais
(~1,1 m de precisão, mais que suficiente em escala urbana), tudo server-side. O celular
recebe geometria já pronta para desenhar.

Também escolhi `ST_Covers` em vez de `ST_Contains`/`ST_Within` para testar se uma horta
está dentro de uma zona: a documentação do PostGIS aponta o *boundary quirk* — pela
definição de `ST_Within`, pontos exatamente sobre a borda do polígono não estão dentro
dele. Numa horta cadastrada na divisa de uma área de alagamento, isso é a diferença entre
alertar e não alertar. E para busca por raio, `ST_DWithin` sobre `geography` em vez de
calcular distância e comparar — usa índice espacial.

📄 [`app/routers/zonas_risco.py`](app/routers/zonas_risco.py) · [`app/routers/hortas.py`](app/routers/hortas.py)

### 4. Foto não passa pela API

**Problema:** upload de foto por uma conexão lenta seguraria um worker da API pelo tempo
todo da transferência, e o mesmo byte trafegaria duas vezes (cliente→API→storage).

**Decisão:** a API só gera uma **presigned URL**; o cliente sobe o arquivo direto para o
Cloudflare R2. Antes disso, o frontend comprime a imagem no próprio dispositivo.

**Trade-off:** exige acertar CORS no bucket e lidar com objetos órfãos (upload que
completa mas cujo registro nunca é criado) — resolvido com verificação via `head_objeto` e
remoção *best-effort*.

📄 [`app/core/storage.py`](app/core/storage.py)

### 5. Permissão centralizada, não espalhada

**Problema:** checagem de privilégio repetida endpoint a endpoint é onde brechas de
autorização nascem — basta esquecer uma linha em uma rota nova.

**Decisão:** todas as regras vivem em um módulo único, com funções que expressam a
intenção (`exigir_lider_da_horta`, `exigir_dono_do_canteiro`,
`exigir_lider_pode_criar_usuario`). Os endpoints declaram o que exigem; a regra em si tem
um lugar só.

Uma auditoria de segurança do próprio projeto encontrou aqui um escalonamento de
privilégio — líder de horta podia criar outro líder — corrigido e coberto por teste.

📄 [`app/permissions.py`](app/permissions.py) · [`tests/test_permissions.py`](tests/test_permissions.py)

### 6. Enum como fonte única de verdade

**Problema:** valores válidos duplicados entre banco e aplicação divergem com o tempo, e o
banco acaba aceitando lixo que a API rejeitaria.

**Decisão:** as enums de domínio geram tanto a validação Pydantic na API quanto as
`CHECK constraints` no PostgreSQL, através de um helper (`enum_check`). Adicionar um valor
é mudar um lugar só.

📄 [`app/database/enums.py`](app/database/enums.py)

### 7. Sessão de 60 dias (decisão de produto, não de segurança)

**Problema:** pedir login toda semana para um usuário idoso que não lembra a credencial é
o suficiente para ele abandonar o app.

**Decisão:** refresh token de 60 dias. O login é por **e-mail + CPF** — decisão de produto
tomada com a pesquisa, porque é o par que esse público efetivamente lembra e sabe digitar.

**Trade-off:** reconheço que CPF não é segredo. A escolha é compensada por outros
controles (hash bcrypt, tokens de acesso curtos, autorização estrita por perfil), e está
documentada como consciente, não por desconhecimento.

## Backend em detalhe

Este é um projeto full-stack solo, mas é no backend que está a maior densidade de decisão
— e é a área em que quero atuar.

- **73 endpoints** em 13 routers organizados por domínio, com schemas Pydantic separados
  por operação (leitura, criação, atualização).
- **Modelagem relacional** com PostGIS: `Geography` para pontos e áreas, índices
  espaciais, CHECK constraints geradas a partir das enums de domínio.
- **30 migrations Alembic** — o esquema nunca foi recriado à mão; toda mudança é
  versionada e reversível.
- **Tratamento de erro global**: handlers de `IntegrityError` → 409,
  `OperationalError` → 503 e `SQLAlchemyError` → 500, com log estruturado e mensagem em
  português claro para o usuário final. Nenhum stack trace vaza para o cliente.
- **Autenticação** JWT com access token curto + refresh token, senha em bcrypt,
  validação de CPF com dígito verificador.
- **Integração externa** (Open-Meteo) com cache em memória por TTL e degradação graciosa:
  se a API de clima cair, o último valor conhecido continua sendo servido.
- **243 testes** cobrindo autenticação, permissões, regras de domínio e queries espaciais.
- **Dependências com versão fixa** — sem isso, dois builds do mesmo commit instalam
  bibliotecas diferentes e a produção roda algo que nunca foi testado.

## Rodando localmente

**Pré-requisitos:** Python 3.12, Node 20+, Docker.

### 1. Banco de dados

```bash
docker compose up -d          # PostgreSQL 15 + PostGIS 3.5 na porta 5435
```

### 2. API

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env          # ajuste SECRET_KEY e DATABASE_URL

alembic upgrade head          # cria o esquema
python scripts/seed.py        # admin demo + catálogo de produtos (idempotente)

uvicorn app.main:app --reload
```

A documentação interativa fica em <http://localhost:8000/docs>.

Usuário demo criado pelo seed: `admin@hortasurbanas.com` / CPF `92263020063`.
Vale só para o ambiente local — em produção o admin vem das variáveis `SEED_ADMIN_*`
do `.env` (ver `.env.example`).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Os tipos do cliente HTTP são **gerados a partir do OpenAPI** da própria API, o que
mantém frontend e backend em sincronia sem duplicar definição de tipo à mão:

```bash
npm run gen:api               # requer a API rodando em localhost:8000
```

## Testes

```bash
pip install -r requirements-test.txt

createdb horta_test           # ou via docker exec
export DATABASE_TEST_URL=postgresql://horta:horta1234@localhost:5435/horta_test

pytest                        # 243 testes
pytest --cov=app              # com cobertura
```

Os testes de integração sobem o esquema real com PostGIS a cada sessão — as queries
espaciais são testadas contra o banco de verdade, não contra mock. Sem
`DATABASE_TEST_URL` definida, eles são pulados em vez de falhar.

## Deploy

Uma VPS, um comando:

```bash
docker compose -f docker-compose.prod.yaml up -d --build
```

O que o arquivo garante:

- **Segredos obrigatórios** — `POSTGRES_PASSWORD:?` aborta o `up` se a senha não estiver
  definida, em vez de subir um Postgres com senha vazia.
- **Ordem de inicialização** — a API só sobe quando o healthcheck do banco passa.
- **Superfície mínima** — o Postgres não vai para a internet; a API é `expose`, não
  `ports`, então só o Caddy a alcança.
- **TLS automático** via Let's Encrypt, com o volume de certificados persistido (perder
  esse volume significa reemitir certificado e esbarrar no rate limit da Let's Encrypt).
- **Cache correto do PWA** — assets com hash no nome são `immutable`; `index.html` e o
  service worker são `no-cache`, senão a atualização automática do app atrasa.

## Estrutura do repositório

```
app/                    # Backend FastAPI
├── core/               # config, segurança, storage (R2), clima, ETag, idempotência
├── database/           # models SQLAlchemy, enums de domínio, sessão
├── routers/            # endpoints por domínio
├── schemas/            # schemas Pydantic
└── permissions.py      # regras de autorização centralizadas

alembic/versions/       # 30 migrations
scripts/                # seed e importação de zonas de risco (shapefile)
tests/                  # 243 testes

frontend/
├── src/features/       # organizado por domínio (auth, hortas, ciclos, mapa...)
├── src/components/     # UI compartilhada (shadcn/ui)
└── android/            # projeto Capacitor
```

## Limitações conhecidas e próximos passos

Sendo honesto sobre o que ainda falta:

- [ ] **Ativar a camada de risco climático** — construída e testada, aguardando a
      importação das zonas do município e o lançamento da gestão.
- [ ] **Rate limiting** na autenticação — apontado na auditoria de segurança, ainda não
      implementado.
- [ ] **Backup automatizado** do banco em produção.
- [ ] **CI** — os testes rodam localmente; falta automatizar no push.
- [ ] Documentação de tratamento de dados pessoais (LGPD) para os usuários finais.

Decisões deliberadas que podem parecer omissão: não há fila de tarefas, cache distribuído
nem sharding. O sistema atende as hortas de um único município — adicionar essa
complexidade seria otimizar para uma escala que o projeto não tem, ao custo de manutenção
que uma pessoa só teria que carregar.

## Autor

**Lorenzo Michelotti Palma**

Projeto desenvolvido individualmente — backend, frontend, app Android, infraestrutura e
deploy — como produto tecnológico de pesquisa em Agricultura Urbana e Periurbana.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/lorenzo-michelotti-palma/)
[![Email](https://img.shields.io/badge/Email-EA4335?logo=gmail&logoColor=white)](mailto:lzmichelotti@gmail.com)
