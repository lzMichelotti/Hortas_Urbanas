extends Control

@export var campo_email: LineEdit
@export var campo_cpf: LineEdit
@export var botao_login: Button
@export var log: Label


func _ready() -> void:
	log.hide()
	botao_login.pressed.connect(_checar_e_enviar)


func _checar_e_enviar() -> void:
	if _validar():
		_fazer_login()


func _validar() -> bool:
	campo_email.modulate = Color.WHITE
	campo_cpf.modulate = Color.WHITE
	if campo_email.text.strip_edges().length() == 0:
		_erro("Preencha o e-mail.", [campo_email])
		return false
	if campo_cpf.text.strip_edges().length() < 11:
		_erro("O CPF deve ter 11 dígitos.", [campo_cpf])
		return false
	return true


func _fazer_login() -> void:
	botao_login.disabled = true
	_info("Autenticando…")
	var email := campo_email.text.strip_edges()
	var cpf := campo_cpf.text.strip_edges()
	var corpo := "grant_type=password&username=%s&password=%s" % [email.uri_encode(), cpf.uri_encode()]

	var r = await Api.requisitar("POST", "/token", {
		"autenticado": false,
		"corpo": corpo,
		"content_type": "application/x-www-form-urlencoded",
		"tentativas": 2,
	})

	if not r.ok:
		botao_login.disabled = false
		if r.code == 401:
			_erro("E-mail ou CPF incorretos.", [campo_email, campo_cpf])
		elif r.code == 0:
			_erro("Erro de rede. Verifique a conexão com o servidor.")
		else:
			_erro("Erro do servidor (código %d)." % r.code)
		return

	Sessao.definir_tokens(r.json)
	_info("Carregando seus dados…")
	var b = await Sessao.bootstrap()
	botao_login.disabled = false
	if not b.ok:
		match b.get("motivo", ""):
			"sem_canteiro":
				_erro("Você ainda não tem um canteiro atribuído. Procure o líder da sua horta.")
			_:
				if b.get("code", 0) == 0:
					_erro("Erro de rede ao carregar seus dados.")
				else:
					_erro("Não foi possível carregar seus dados.")
		return

	get_tree().change_scene_to_file("res://Lab/menu_principal.tscn")


func _erro(mensagem: String, campos: Array = []) -> void:
	for campo in campos:
		campo.modulate = Color(1.0, 0.213, 0.16, 1.0)
	log.modulate = Color(1.0, 0.302, 0.286, 1.0)
	log.text = mensagem
	log.show()


func _info(mensagem: String) -> void:
	log.modulate = Color(0.043, 0.247, 0.8, 1.0)
	log.text = mensagem
	log.show()
