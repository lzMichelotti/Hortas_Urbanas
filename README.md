# Hortas Urbanas

API (FastAPI + PostgreSQL/PostGIS) e app de cadastro (Godot 4) para gestão de hortas urbanas.

Este guia é o passo a passo para **clonar e rodar o projeto na sua máquina, do zero**.
Funciona em **Windows, Linux e macOS** — onde o comando muda entre sistemas, mostramos as
duas versões. O esquema é criado pelo Alembic e um **seed** insere dados fictícios
(um admin + catálogo de produtos), então dá para logar e testar em poucos minutos.

> 🪟 **Windows:** os comandos marcados com **🪟 Windows (PowerShell)** assumem o
> **PowerShell** (o terminal padrão do Windows 10/11). Onde houver essa marca, use a
> versão dela no lugar da linha de cima.

---

## Pré-requisitos

| Ferramenta | Versão | Para quê |
|---|---|---|
| **Docker Desktop** (+ Compose) | recente | subir o banco PostgreSQL/PostGIS |
| **Python** | 3.12+ | rodar a API |
| **Git** | recente | clonar o repositório |
| **Godot** | 4.6 | rodar o app de cadastro (frontend) |

### 🪟 Windows — instale antes de começar

1. **Docker Desktop** — https://www.docker.com/products/docker-desktop/
   Na primeira execução ele pede para ativar o **WSL2**; aceite. Deixe o Docker Desktop
   **aberto** (ícone da baleia na bandeja) enquanto trabalha — é ele que fornece o `docker`.
2. **Python 3.12+** — https://www.python.org/downloads/
   Na primeira tela do instalador, **marque "Add python.exe to PATH"**. Sem isso o
   comando `python` não funciona no terminal.
3. **Git** — https://git-scm.com/download/win

Abra um PowerShell **novo** (para o PATH atualizar) e confira que tudo responde:

```powershell
docker --version
python --version
git --version
```

---

## 1. Backend (API + banco)

Abra o terminal na pasta onde quer o projeto e siga os passos **em ordem**.

### 1.1 Clonar o repositório

```bash
git clone <url-do-repositorio>
cd Hortas_Urbanas
```

### 1.2 Criar o arquivo de configuração `.env`

Copie o modelo:

```bash
cp .env.example .env
```

🪟 **Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
```

**Pronto — não precisa editar nada para rodar local.** O `.env.example` já vem com o
`DATABASE_URL` do `docker-compose.yaml` e uma `SECRET_KEY` de desenvolvimento.

> ⚠️ **Só em produção:** troque a `SECRET_KEY` por uma chave própria. Para gerar uma:
> ```bash
> openssl rand -hex 32                                   # Linux/macOS
> ```
> 🪟 **Windows (PowerShell)** — funciona em qualquer sistema com Python:
> ```powershell
> python -c "import secrets; print(secrets.token_hex(32))"
> ```

### 1.3 Subir o banco (Docker)

Com o **Docker Desktop aberto**:

```bash
docker compose up -d --wait db
```

Isso baixa a imagem do PostGIS, sobe o container e **espera o banco ficar pronto**.
A primeira vez demora um pouco (download da imagem).

> **Conflito de porta?** Se a `5435` já estiver em uso, edite a linha `ports` do
> `docker-compose.yaml` (ex.: `"5436:5432"`) e a porta no `DATABASE_URL` do `.env`
> para o mesmo número.

### 1.4 Criar o ambiente Python e instalar dependências

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

🪟 **Windows (PowerShell):**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> 🪟 Se o PowerShell recusar com *"execution of scripts is disabled on this system"*,
> rode o comando abaixo **uma vez** e tente ativar de novo:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```
> (Alternativa: use o **Prompt de Comando** em vez do PowerShell e ative com
> `.venv\Scripts\activate.bat`.)

Com o ambiente ativo aparece `(.venv)` no início da linha do terminal. Os próximos
comandos (`alembic`, `python`, `uvicorn`) precisam dele ativo.

### 1.5 Criar o esquema do banco

```bash
alembic upgrade head
```

### 1.6 Popular dados de teste (admin + produtos)

```bash
python scripts/seed.py
```

### 1.7 Ligar a API

```bash
uvicorn app.main:app --reload --port 8000
```

Pronto. A API fica em **http://localhost:8000** e a documentação interativa (Swagger)
em **http://localhost:8000/docs**. Deixe esse terminal aberto enquanto usa o app —
para parar, **Ctrl+C**.

---

## 2. Login de teste

O seed cria um usuário **admin**. O login é **e-mail + CPF**, e a senha é o próprio CPF:

| E-mail | CPF (senha) | Privilégio |
|---|---|---|
| `admin@hortasurbanas.com` | `92263020063` | ADMIN_SUPREMO |

Dá para testar agora mesmo pelo Swagger (`/docs`) ou pelo app Godot (seção 3).

> O cadastro de novas hortas (`POST /hortas/registro`) exige um admin autenticado —
> por isso o seed já inclui esse usuário.

---

## 3. Frontend (app de cadastro — Godot) — opcional

1. Instale o **Godot 4.6** — https://godotengine.org/download
2. Abra o projeto: `frontend/cadastro/project.godot`.
3. Rode com **F5**. A tela inicial é o **Login**.
4. Faça login com o admin da tabela acima → você cai na tela de **Cadastro**.
5. Preencha a horta + dados do líder e clique em **Registrar**
   (envia `POST /hortas/registro` para a API).

> Mantenha a API rodando (seção 1.7) enquanto usa o app. O app é nativo (Godot) — não há
> "link" para abrir no navegador; só a API tem interface web (o Swagger em `/docs`).
> Detalhes da integração em [frontend/Alteracoes.md](frontend/Alteracoes.md).

---

## Testes automatizados (opcional)

A suíte (`pytest`) roda contra um **banco de teste separado** (`horta_test`): ela recria
o schema do zero e limpa as tabelas entre os testes, então **não toca** no banco de
desenvolvimento nem nos dados do seed.

```bash
# 1. Dependências de teste
pip install -r requirements-test.txt

# 2. Criar o banco de teste (só na primeira vez)
docker compose exec db createdb -U horta horta_test

# 3. Rodar a suíte
TEST_DATABASE_URL=postgresql://horta:horta1234@localhost:5435/horta_test pytest
```

🪟 **Windows (PowerShell)** — o passo 3 muda (a variável vai antes, separada):

```powershell
pip install -r requirements-test.txt
docker compose exec db createdb -U horta horta_test
$env:TEST_DATABASE_URL="postgresql://horta:horta1234@localhost:5435/horta_test"; pytest
```

> Sem `TEST_DATABASE_URL` os testes de integração são **pulados** (skip), não falham.

---

## Recarregar / resetar o banco

Para apagar tudo e recriar do zero:

```bash
docker compose down -v          # remove o volume do banco
docker compose up -d --wait db  # sobe vazio e espera ficar pronto
alembic upgrade head            # recria o esquema
python scripts/seed.py          # repopula admin + produtos
```

---

## Solução de problemas

| Sintoma | Causa provável / solução |
|---|---|
| `docker : ... não é reconhecido` / `command not found` | Docker Desktop não instalado ou **fechado**. Abra o Docker Desktop e aguarde a baleia ficar verde. |
| `python : ... não é reconhecido` (Windows) | Não marcou *"Add python.exe to PATH"* na instalação. Reinstale marcando a opção, ou use `py` no lugar de `python`. |
| `Activate.ps1 cannot be loaded because running scripts is disabled` | Política do PowerShell. Rode `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` (veja a seção 1.4). |
| `connection refused` / `could not translate host name` ao rodar `alembic` ou a API | O banco não subiu (passo 1.3). Confira que o container está de pé e que a porta `5435` confere com o `DATABASE_URL` do `.env`. |
| `pydantic ... SECRET_KEY field required` / `DATABASE_URL field required` | Faltou criar o `.env` (passo 1.2: `cp .env.example .env`). |
| `port is already allocated` ao subir o Docker | Algo já usa a `5435`. Troque a porta (veja a nota do passo 1.3). |

---

## Estrutura do projeto

```
app/                  # API FastAPI (rotas, schemas, models, core)
alembic/              # migrações do banco
scripts/seed.py       # popula admin + produtos (após alembic upgrade head)
tests/                # suíte pytest (usa um banco de teste separado)
frontend/cadastro/    # app Godot (login + cadastro de hortas)
docker-compose.yaml   # serviço do banco PostgreSQL/PostGIS
```

---

## Notas

- **CORS:** só afeta clientes em navegador; o app Godot nativo não passa por CORS.
  Em produção, ajuste `CORS_ORIGINS` no `.env`.
- **Produção:** troque o `http://localhost:8000` do frontend pelo domínio real (HTTPS).
  Veja os pontos de atenção em [frontend/Alteracoes.md](frontend/Alteracoes.md).
