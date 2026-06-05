extends Node

const URL_BASE := "http://127.0.0.1:8000"
const ARQUIVO_CACHE_PRODUTOS := "user://produtos_cache.json"

var access_token: String = ""
var refresh_token: String = ""
var token_type: String = "bearer"

var id_usuario: int = 0
var nome_usuario: String = ""
var horta_id: int = 0
var privilegio: String = ""
var canteiro_id: int = 0
var canteiro_nome: String = ""

var produto_id_por_nome: Dictionary = {}
var nome_por_produto_id: Dictionary = {}

var ciclos: Array = []
var ciclos_carregados: bool = false


func tem_token() -> bool:
	return access_token.length() > 0


func cabecalho_auth() -> String:
	return "Authorization: %s %s" % [token_type.capitalize(), access_token]


func definir_tokens(dados: Dictionary) -> void:
	access_token = dados.get("access_token", access_token)
	refresh_token = dados.get("refresh_token", refresh_token)
	token_type = dados.get("token_type", "bearer")


func limpar() -> void:
	access_token = ""
	refresh_token = ""
	id_usuario = 0
	nome_usuario = ""
	horta_id = 0
	privilegio = ""
	canteiro_id = 0
	canteiro_nome = ""
	ciclos = []
	ciclos_carregados = false


func bootstrap() -> Dictionary:
	var me = await Api.requisitar("GET", "/usuarios/me", {"tentativas": 2})
	if not me.ok:
		return {"ok": false, "motivo": "me", "code": me.code}
	var dados = me.json
	id_usuario = int(dados.get("id", 0))
	nome_usuario = str(dados.get("nome", ""))
	horta_id = int(dados.get("horta_id", 0)) if dados.get("horta_id") != null else 0
	privilegio = str(dados.get("privilegio", ""))

	var cs = await Api.requisitar("GET", "/canteiros", {"tentativas": 2})
	if not cs.ok:
		return {"ok": false, "motivo": "canteiros", "code": cs.code}
	var lista = cs.json
	if not (lista is Array) or lista.is_empty():
		return {"ok": false, "motivo": "sem_canteiro"}

	var escolhido = lista[0]
	for c in lista:
		var dono = c.get("usuario_id")
		if dono != null and int(dono) == id_usuario:
			escolhido = c
			break
	canteiro_id = int(escolhido.get("id", 0))
	canteiro_nome = str(escolhido.get("identificacao", ""))
	return {"ok": true}


func garantir_produtos() -> bool:
	if not produto_id_por_nome.is_empty():
		return true
	var cache := _ler_cache_produtos()
	var headers := []
	if cache.has("etag"):
		headers.append("If-None-Match: " + str(cache["etag"]))
	var r = await Api.requisitar("GET", "/produtos", {"tentativas": 2, "headers": headers})

	if r.code == 304 and cache.has("produtos"):
		definir_produtos(cache["produtos"])
		return true
	if r.ok and r.json is Array:
		definir_produtos(r.json)
		_gravar_cache_produtos(str(r.headers.get("etag", "")), r.json)
		return true
	if cache.has("produtos"):
		definir_produtos(cache["produtos"])
		return true
	return false


func definir_produtos(lista: Array) -> void:
	produto_id_por_nome.clear()
	nome_por_produto_id.clear()
	for p in lista:
		if not (p is Dictionary):
			continue
		var pid := int(p.get("id", 0))
		var nome := str(p.get("nome", ""))
		if pid == 0 or nome == "":
			continue
		produto_id_por_nome[nome] = pid
		nome_por_produto_id[pid] = nome


func garantir_ciclos(forcar: bool = false) -> bool:
	if ciclos_carregados and not forcar:
		return true
	if canteiro_id == 0:
		return false
	var r = await Api.requisitar("GET", "/canteiros/%d/ciclos" % canteiro_id, {"tentativas": 2})
	if r.ok and r.json is Array:
		ciclos = r.json
		ciclos_carregados = true
		return true
	return false


func criar_ciclo(corpo: Dictionary, idempotency_key: String) -> Dictionary:
	if canteiro_id == 0:
		return {"ok": false, "code": 0, "json": null}
	var r = await Api.requisitar("POST", "/canteiros/%d/ciclos" % canteiro_id, {
		"corpo": corpo,
		"idempotency_key": idempotency_key,
		"tentativas": 3,
		"backoff": 1.0,
	})
	if r.ok and r.json is Dictionary:
		ciclos.append(r.json)
	return r


func _ler_cache_produtos() -> Dictionary:
	if not FileAccess.file_exists(ARQUIVO_CACHE_PRODUTOS):
		return {}
	var f := FileAccess.open(ARQUIVO_CACHE_PRODUTOS, FileAccess.READ)
	if f == null:
		return {}
	var dados = JSON.parse_string(f.get_as_text())
	f.close()
	return dados if dados is Dictionary else {}


func _gravar_cache_produtos(etag: String, produtos: Array) -> void:
	var f := FileAccess.open(ARQUIVO_CACHE_PRODUTOS, FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify({"etag": etag, "produtos": produtos}))
	f.close()
