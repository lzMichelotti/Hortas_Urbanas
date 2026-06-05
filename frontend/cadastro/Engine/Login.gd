extends Control

@export var campo_email: LineEdit
@export var campo_cpf: LineEdit
@export var botao_login: Button
@export var log: Label

var _http: HTTPRequest
var _erro_timer: Timer

const URL_TOKEN = "http://127.0.0.1:8000/token"

func _ready() -> void:
	log.hide()

	_http = HTTPRequest.new()
	add_child(_http)
	_http.request_completed.connect(_on_request_completed)

	_erro_timer = Timer.new()
	_erro_timer.wait_time = 1.5
	_erro_timer.one_shot = true
	_erro_timer.autostart = false
	_erro_timer.timeout.connect(_clear_error)
	add_child(_erro_timer)

	botao_login.pressed.connect(_checar_e_enviar)

func _checar_e_enviar() -> void:
	if _validar():
		_fazer_login()

func _validar() -> bool:
	if campo_email.text.strip_edges().length() == 0:
		_emitir_erro("Preencha o e-mail.", [campo_email])
		return false
	if campo_cpf.text.length() < 11:
		_emitir_erro("O CPF deve ter 11 dígitos.", [campo_cpf])
		return false
	return true

func _fazer_login() -> void:
	botao_login.disabled = true
	_emitir_log("Autenticando…")

	var email = campo_email.text.strip_edges()
	var cpf = campo_cpf.text.strip_edges()
	var body = "grant_type=password&username=%s&password=%s" % [email.uri_encode(), cpf]
	var headers = PackedStringArray(["Content-Type: application/x-www-form-urlencoded"])

	_http.request(URL_TOKEN, headers, HTTPClient.METHOD_POST, body)

func _on_request_completed(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	botao_login.disabled = false

	if result != HTTPRequest.RESULT_SUCCESS:
		_emitir_erro("Erro de rede. Verifique a conexão com o servidor.")
		return

	if response_code == 200:
		var dados = JSON.parse_string(body.get_string_from_utf8())
		if dados and dados.has("access_token"):
			Sessao.access_token = dados["access_token"]
			Sessao.token_type = dados.get("token_type", "bearer")
			get_tree().change_scene_to_file("res://cenas/cadastro.tscn")
			return
		_emitir_erro("Resposta inesperada do servidor.")
	elif response_code == 401:
		_emitir_erro("E-mail ou CPF incorretos.", [campo_email, campo_cpf])
	else:
		_emitir_erro("Erro do servidor (código %d)." % response_code)

func _emitir_erro(mensagem: String, campos: Array = []) -> void:
	for campo in campos:
		campo.modulate = Color(1.0, 0.213, 0.16, 1.0)
	_erro_timer.start()
	log.modulate = Color(1.0, 0.302, 0.286, 1.0)
	log.text = mensagem
	log.show()

func _emitir_log(mensagem: String) -> void:
	log.modulate = Color(0.043, 0.247, 0.8, 1.0)
	log.text = mensagem
	log.show()

func _clear_error() -> void:
	campo_email.modulate = Color(1, 1, 1)
	campo_cpf.modulate = Color(1, 1, 1)
	await get_tree().create_timer(3.5).timeout
	log.hide()
