extends Node

const TIMEOUT := 15.0


func requisitar(metodo: String, caminho: String, opts: Dictionary = {}) -> Dictionary:
	var autenticado: bool = opts.get("autenticado", true)
	var corpo = opts.get("corpo", null)
	var content_type: String = opts.get("content_type", "application/json")
	var idempotency_key: String = opts.get("idempotency_key", "")
	var tentativas: int = opts.get("tentativas", 1)
	var backoff: float = opts.get("backoff", 1.0)
	var timeout: float = opts.get("timeout", TIMEOUT)
	var permitir_refresh: bool = opts.get("permitir_refresh", autenticado)
	var headers_extra: Array = opts.get("headers", [])

	var url := Sessao.URL_BASE + caminho
	var corpo_str := _montar_corpo(corpo, content_type)
	var metodo_http := _metodo(metodo)

	var ja_tentou_refresh := false
	var tentativa := 0
	while true:
		tentativa += 1
		var headers := _montar_headers(autenticado, corpo, content_type, idempotency_key, headers_extra)
		var r = await _enviar(url, headers, metodo_http, corpo_str, timeout)

		if r.result != HTTPRequest.RESULT_SUCCESS:
			if tentativa < tentativas:
				await _esperar(backoff * tentativa)
				continue
			return {"ok": false, "code": 0, "json": null, "headers": {}, "result": r.result}

		if r.code == 401 and autenticado and permitir_refresh and not ja_tentou_refresh:
			ja_tentou_refresh = true
			if await _refresh():
				tentativa -= 1
				continue
			return {"ok": false, "code": 401, "json": _json(r.body), "headers": r.headers, "result": r.result}

		if r.code >= 500:
			if tentativa < tentativas:
				await _esperar(backoff * tentativa)
				continue
			return {"ok": false, "code": r.code, "json": _json(r.body), "headers": r.headers, "result": r.result}

		return {
			"ok": r.code >= 200 and r.code < 300,
			"code": r.code,
			"json": _json(r.body),
			"headers": r.headers,
			"result": r.result,
		}
	return {"ok": false, "code": 0, "json": null, "headers": {}, "result": -1}


func gerar_uuid() -> String:
	var b := Crypto.new().generate_random_bytes(16)
	b.set(6, (b[6] & 0x0f) | 0x40)
	b.set(8, (b[8] & 0x3f) | 0x80)
	var h := b.hex_encode()
	return "%s-%s-%s-%s-%s" % [h.substr(0, 8), h.substr(8, 4), h.substr(12, 4), h.substr(16, 4), h.substr(20, 12)]


func _refresh() -> bool:
	if Sessao.refresh_token == "":
		return false
	var corpo := JSON.stringify({"refresh_token": Sessao.refresh_token})
	var headers := PackedStringArray(["Content-Type: application/json"])
	var r = await _enviar(Sessao.URL_BASE + "/token/refresh", headers, HTTPClient.METHOD_POST, corpo, TIMEOUT)
	if r.result == HTTPRequest.RESULT_SUCCESS and r.code == 200:
		var j = _json(r.body)
		if j is Dictionary and j.has("access_token"):
			Sessao.definir_tokens(j)
			return true
	return false


func _enviar(url: String, headers: PackedStringArray, metodo: int, corpo_str: String, timeout: float) -> Dictionary:
	var http := HTTPRequest.new()
	http.timeout = timeout
	add_child(http)
	var err := http.request(url, headers, metodo, corpo_str)
	if err != OK:
		http.queue_free()
		return {"result": -1, "code": 0, "headers": {}, "body": PackedByteArray()}
	var resp = await http.request_completed
	http.queue_free()
	return {"result": resp[0], "code": resp[1], "headers": _headers_dict(resp[2]), "body": resp[3]}


func _montar_corpo(corpo, content_type: String) -> String:
	if corpo == null:
		return ""
	if corpo is String:
		return corpo
	if content_type.begins_with("application/json"):
		return JSON.stringify(corpo)
	return str(corpo)


func _montar_headers(autenticado: bool, corpo, content_type: String, idempotency_key: String, extra: Array) -> PackedStringArray:
	var headers := PackedStringArray()
	if corpo != null:
		headers.append("Content-Type: " + content_type)
	if autenticado and Sessao.tem_token():
		headers.append(Sessao.cabecalho_auth())
	if idempotency_key != "":
		headers.append("Idempotency-Key: " + idempotency_key)
	for h in extra:
		headers.append(h)
	return headers


func _metodo(metodo: String) -> int:
	match metodo.to_upper():
		"POST":
			return HTTPClient.METHOD_POST
		"PATCH":
			return HTTPClient.METHOD_PATCH
		"PUT":
			return HTTPClient.METHOD_PUT
		"DELETE":
			return HTTPClient.METHOD_DELETE
		_:
			return HTTPClient.METHOD_GET


func _headers_dict(headers: PackedStringArray) -> Dictionary:
	var d := {}
	for h in headers:
		var i := h.find(":")
		if i > 0:
			d[h.substr(0, i).strip_edges().to_lower()] = h.substr(i + 1).strip_edges()
	return d


func _json(body: PackedByteArray):
	if body.is_empty():
		return null
	return JSON.parse_string(body.get_string_from_utf8())


func _esperar(segundos: float) -> void:
	await get_tree().create_timer(segundos).timeout
