# Autenticação JWT — O que foi adicionado

## Contexto

O app `cadastro` não tinha como se autenticar na API. Para escrever dados (POST/PATCH/DELETE), a API exige um token JWT no header `Authorization: Bearer <token>`. Este trabalho adiciona a tela de login e a camada de estado que guarda o token.

---

## Arquivos adicionados

### `frontend/cadastro/cenas/Login.tscn`
Cena de login. É a **cena inicial do projeto** (ver `project.godot`).

Hierarquia de nós:
```
Login (Control)               ← raiz, tem o script Login.gd
├── Centro (CenterContainer)  ← centraliza o formulário na tela
│   └── VBoxContainer
│       ├── Titulo (Label)
│       ├── HSeparator
│       ├── email_label (Label)
│       ├── campo_email (LineEdit)     ← e-mail do usuário
│       ├── cpf_label (Label)
│       ├── campo_cpf (LineEdit)       ← CPF, máx 11 dígitos
│       ├── HSeparator2
│       └── botao_login (Button)       ← dispara o login
└── log (Label)               ← feedback de erro/sucesso, âncora inferior
```

---

### `frontend/cadastro/Engine/Login.gd`
Script da tela de login. Segue exatamente o mesmo padrão de `Engine/cadastro.gd`.

**Responsabilidades:**
- Valida os campos antes de enviar
- Monta e envia o `POST /token` com `Content-Type: application/x-www-form-urlencoded`
- Em caso de sucesso (HTTP 200): salva o token em `Sessao` e navega para `cadastro.tscn`
- Em caso de erro 401: destaca os campos em vermelho e exibe a mensagem
- Em caso de erro de rede: exibe mensagem sem travar o botão

**Constante que pode precisar de ajuste antes do deploy:**
```gdscript
const URL_TOKEN = "http://localhost:8000/token"
```
Altere para o endereço de produção da API.

---

### `frontend/cadastro/Engine/Sessao.gd`
Singleton (autoload) que guarda o token em memória enquanto o app está aberto.

```gdscript
Sessao.access_token   # String — o JWT retornado pela API
Sessao.token_type     # String — "bearer" (vem da API)
Sessao.tem_token()    # bool   — true se o token foi preenchido
Sessao.cabecalho_auth() # String — "Authorization: Bearer <token>"
```

**Como usar no `cadastro.gd` quando for implementar o envio real:**
```gdscript
var headers = PackedStringArray([
    "Content-Type: application/json",
    Sessao.cabecalho_auth()
])
_http.request(URL_API + "/hortas", headers, HTTPClient.METHOD_POST, JSON.stringify(dados))
```

---

## Arquivos modificados

### `frontend/cadastro/project.godot`

Duas linhas adicionadas:

**1. Cena inicial** (seção `[application]`):
```
config/run/main_scene="res://cenas/Login.tscn"
```
O app agora abre na tela de login, não em branco.

**2. Autoload** (seção nova `[autoload]`):
```
Sessao="*res://Engine/Sessao.gd"
```
Registra `Sessao.gd` como singleton global acessível de qualquer script pelo nome `Sessao`.

---

## Fluxo completo após o login

```
App abre
  └─▶ Login.tscn
        ├─ usuário preenche e-mail + CPF
        ├─ POST /token  →  API retorna { access_token, token_type }
        ├─ token salvo em Sessao.access_token
        └─▶ cadastro.tscn  (cena existente, sem alterações)
                └─ qualquer requisição autenticada usa Sessao.cabecalho_auth()
```

---

## O que NÃO foi alterado

- `Engine/cadastro.gd` — sem alterações
- `cenas/cadastro.tscn` — sem alterações
- `Engine/Dados.gd` — sem alterações
- Nenhum arquivo do backend

---

## Pré-requisito para testar

Confirmar com a equipe de backend que existe um usuário `ADMIN_SUPREMO` ativo no banco de dados. Sem esse usuário cadastrado, qualquer tentativa de login retorna 401.

---

# Integração do Cadastro com a API — O que foi adicionado

## Contexto

A tela de cadastro só tinha um **stub**: `_registrar()` exibia "Registro feito com sucesso!" sem enviar nada, e `_checar_os_dados_e_enviar()` montava um dicionário **aninhado** (`admin`/`endereco`/`a_horta`) que **não** correspondia ao contrato da API.

Agora o cadastro faz **uma única requisição** ao endpoint atômico `POST /hortas/registro`, que cria a horta e o líder na mesma transação. O envio usa o token JWT já salvo em `Sessao` durante o login (o usuário só chega nesta tela depois de autenticar).

---

## Arquivos modificados

### `frontend/cadastro/Engine/cadastro.gd`

Único arquivo alterado. Mudanças, item a item:

- **Novo nó `HTTPRequest`** criado em `_ready()` (`_http`), adicionado com `add_child` e com o sinal `request_completed` conectado ao handler `_on_request_completed` — mesmo padrão de `Engine/Login.gd`.
- **Nova constante** `const URL_API = "http://localhost:8000"` (mesma base do `URL_TOKEN` do Login).
- **Stub `_registrar` e dicionário aninhado substituídos** pela montagem de um **payload plano** em dois objetos (`horta` + `lider`) e pelo envio real via `_http.request(... HTTPClient.METHOD_POST, JSON.stringify(payload))`.
- **`area_total`** convertido com `.to_float()`; se não for `is_valid_float()` ou for `<= 0`, mostra erro e **não envia**.
- **CPF** enviado **só com dígitos** (helper `_so_digitos`).
- **Senha tornada opcional:** `senha`/`senharep` foram **removidos do array `check`** (deixaram de ser obrigatórios). As checagens de tamanho mínimo e de igualdade só rodam **se `senha` estiver preenchida**. A senha **não é enviada à API** — o login é **email + CPF** e o backend define a senha = CPF. Os campos continuam na tela e continuam sendo limpos por `_limpar_dados()` (limpeza explícita, já que saíram do `check`).
- **Verificação de sessão:** antes de enviar, se `Sessao.tem_token()` for `false`, mostra "Sessão expirada. Faça login novamente." e **aborta**.
- **Botão `registrar`** é desabilitado no início do envio (`_emitir_log("Enviando…")`) e **reabilitado em qualquer desfecho** no handler.

### Campos do form que **NÃO** vão na requisição (mantidos na UI)

- `senha` / `senharep` — login é email + CPF; senha definida pelo backend.
- `canteiros` — não existe no payload; canteiros são criados depois, em outra tela. (Continua como campo obrigatório de UX.)
- `pubemail` / `pubtelefone` — sem campo equivalente no schema.

---

## Endpoint consumido

**`POST http://localhost:8000/hortas/registro`** — exige admin autenticado (`Authorization: Bearer <token>`).

Corpo JSON (formato exato de `HortaRegistroCreate` em `app/schemas/horta.py`):

```json
{
  "horta": {
    "nome":             "<nomehorta>",
    "rua":              "<endereco_rua>",
    "numero":           "<endereco_numero>",
    "bairro":           "<endereco_bairro>",
    "cep":              "<endereco_cep>",
    "cidade":           "<endereco_cidade>",
    "uf":               "<endereco_uf>",
    "area_total":       12.5,
    "publico_atendido": "<comunidade>"
  },
  "lider": {
    "nome":     "<nome>",
    "email":    "<email>",
    "cpf":      "<11 dígitos>",
    "telefone": "<telefone>"
  }
}
```

Códigos de resposta tratados:

| Código | Tratamento |
|--------|------------|
| `RESULT != SUCCESS` | "Erro de rede. Verifique a conexão com o servidor." |
| `201` | "Cadastro realizado com sucesso!" + `_limpar_dados()` |
| `401` | "Sessão expirada. Faça login novamente." |
| `409` | lê `detail` do corpo (ex.: "Este CPF já está cadastrado." / "Este Email já está cadastrado.") e destaca o campo `cpf` ou `email` conforme a mensagem |
| `422` | "Dados inválidos. Verifique os campos." + corpo logado com `push_warning` |
| outro | "Erro do servidor (código %d)." |

---

## Fluxo completo (login → cadastro)

```
Login.tscn
  ├─ POST /token  →  { access_token, token_type }
  └─ token salvo em Sessao.access_token
       └─▶ cadastro.tscn
             ├─ usuário preenche horta + dados do líder
             ├─ validação local (campos, CPF 11 díg., area_total numérica > 0)
             ├─ checa Sessao.tem_token()
             ├─ POST /hortas/registro  (Authorization: Bearer <token>)
             │     corpo = { horta: {...}, lider: {...} }
             └─ 201  →  "Cadastro realizado com sucesso!" + limpa o form
```

---

## O que NÃO foi alterado

- `cenas/cadastro.tscn` e demais cenas `.tscn` — sem alterações.
- Backend (rotas/schemas) — sem alterações.
- `Engine/Login.gd`, `Engine/Sessao.gd`, `Engine/Dados.gd` e demais scripts — sem alterações.

---

## Pré-requisito para testar

- Estar **logado como `ADMIN_SUPREMO`** (o endpoint exige admin) — o token precisa estar em `Sessao`.
- API no ar em `http://localhost:8000`.

---

## TODO conhecido

- O formulário **não coleta latitude/longitude**, então a horta criada **não aparece no mapa** até ter coordenadas. Marcado no código com `# TODO: geocodificar endereço ou coletar lat/lng (mapa)`.

---

## Pontos de atenção (avaliar depois — NÃO aplicados)

1. **Faltam timeouts nas requisições.** Se o servidor travar sem responder, `request_completed` nunca dispara e o botão fica desabilitado para sempre. Resolver com `_http.timeout = 10.0` no `_ready()` (cai sozinho no ramo de erro de rede). Aplicar em `cadastro.gd` **e** `Login.gd`.

2. **Base da API duplicada** (`http://localhost:8000` em `cadastro.gd` e `Login.gd`). No deploy é preciso trocar nos dois. Sugestão: centralizar em `Sessao` (`const URL_BASE`) e usar `Sessao.URL_BASE + "/..."`.

---

# Integração do app de PRODUÇÃO com a API

O `frontend/app` era 100% local. Agora o fluxo que já existia (login → canteiro → plantio →
calendário) fala com o backend. Nenhuma tela nova; só integração. Prioridade: rede (menos
requisições, resiliência a quedas).

## Arquivos novos (`frontend/app/`)

- **`Engine/Api.gd`** (autoload `Api`): camada única de rede. `requisitar(metodo, caminho, opts)`
  → `{ok, code, json, headers, result}`. Concentra **timeout (15s, configurável por chamada)**,
  **retry com backoff**, **`Idempotency-Key` reusada nas retentativas**, e **refresh automático
  no 401**. Usa **1 `HTTPRequest` por chamada** (estratégia oficial p/ não ter requisições
  simultâneas no mesmo nó). `gerar_uuid()` cria a key (UUID v4 via `Crypto`; bytes via `set()`).
- **`Engine/Sessao.gd`** (autoload `Sessao`): estado da sessão + fluxos. Guarda tokens,
  `URL_BASE`, identidade (`/usuarios/me`), `canteiro_id`, mapas `produto_id_por_nome`/
  `nome_por_produto_id` e cache de `ciclos`. Métodos: `bootstrap()` (me+canteiros, 1×/sessão),
  `garantir_produtos()` (catálogo com **cache ETag em `user://`** → 304/offline),
  `garantir_ciclos()`, `criar_ciclo()` (POST; anexa o ciclo retornado, sem GET extra), `limpar()`.
- **`Engine/Login.gd` + `Lab/login.tscn`**: login copiado do `cadastro`, usando `Api` + chamando
  `Sessao.bootstrap()`. É a cena inicial do app. Login = e-mail + CPF.

Docs: [HTTPRequest](https://docs.godotengine.org/en/stable/classes/class_httprequest.html) ·
[Autoload](https://docs.godotengine.org/en/stable/tutorials/scripting/singletons_autoload.html) ·
[Crypto](https://docs.godotengine.org/en/stable/classes/class_crypto.html) ·
[FileAccess](https://docs.godotengine.org/en/stable/classes/class_fileaccess.html) ·
[ETag/304 (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Conditional_requests) ·
[Idempotency-Key (IETF)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)

## Arquivos alterados (`frontend/app/`)

- **`project.godot`**: cena inicial = `login.tscn`; autoloads `Sessao` e `Api`.
- **`Engine/AdicionarProducao.gd`**: `_confirma_plantio()` resolve o `produto_id` pelo nome e faz
  `POST /canteiros/{id}/ciclos` (com `quantidade`, `Idempotency-Key` + retry); removida a lógica
  de estoque local (sem backend). Feedback no `resumo` existente.
- **`Engine/Calendario.gd`**: +1 método `atualizar()` — preenche o **mesmo** dict
  `Dados.produtos_em_producao` a partir de `Sessao.ciclos` e chama o `_create_calendar()` existente.
- **`Engine/MenuProducao.gd`**: ao abrir, `garantir_ciclos()` + `calendario.atualizar()`.

`Clima.gd` **não** mudou. `MenuPrincipal.gd`/`Dados.gd` só tiveram o warning de parâmetro
não usado corrigido (`_process(delta)` → `_process(_delta)`), sem mudança de lógica.
`Dados.insumos` segue como lista do plantio.

## Decisões

- **D1** `produto_id` por **nome em runtime** (os 67 nomes dos `.tres` batem 100% com o catálogo);
  `/produtos` cacheado por ETag. Sem id embutido no `.tres`.
- **D2** coluna **nullable `quantidade`** em `Ciclos_Producao` (a UI já coletava o valor).
  Backend: `app/database/models.py`, `app/schemas/ciclo.py`, migration `d1e2f3a4b5c6`.
- **D3** login **copiado** do `cadastro` (projetos separados; unificar = risco fora de escopo).
- **D4** timeout + retry + `Idempotency-Key` reusada + refresh no 401 (tudo no `Api`).

## Na prateleira

Entrada de insumos / saída / estoque (sem modelo no backend); **colheita** (backend suporta via
`PATCH /ciclos/{id}`, mas não há tela ligada); nome da horta no cabeçalho (fixo); seletor de
múltiplos canteiros.

## Testar

API no ar com `alembic upgrade head` + `python scripts/seed.py`, e um usuário
**MEMBRO_CANTEIRO com canteiro atribuído** (senão o login avisa "sem canteiro"). Produção:
trocar `Sessao.URL_BASE`.
