extends Control

@export var nome:TextEdit
@export var email:LineEdit
@export var pubemail:CheckBox
@export var telefone:LineEdit
@export var pubtelefone:CheckBox
@export var cpf:LineEdit
@export var senha:LineEdit
@export var senharep:LineEdit

@export var nomehorta:TextEdit
@export var endereco_rua:LineEdit
@export var endereco_numero:LineEdit
@export var endereco_bairro:LineEdit
@export var endereco_cep:LineEdit
@export var endereco_cidade:LineEdit
@export var endereco_uf:LineEdit
@export var comunidade:LineEdit
@export var area_total:LineEdit
@export var canteiros:LineEdit

@export var registrar:Button
@export var limpar:Button

@export var log:Label

# Mesma base usada em Engine/Login.gd (URL_TOKEN). Ajustar para produção.
const URL_API = "http://127.0.0.1:8000"

var erro_timer:Timer
var check:Array
var _http:HTTPRequest

func _ready() -> void:
	log.hide()
	registrar.pressed.connect(_checar_os_dados_e_enviar)
	erro_timer = Timer.new()
	erro_timer.wait_time = 1.5
	erro_timer.timeout.connect(_clear_error)
	erro_timer.one_shot = true
	erro_timer.autostart = false
	add_child(erro_timer)
	# HTTPRequest para o envio real (mesmo padrão de Engine/Login.gd):
	# docs.godotengine.org/en/stable/classes/class_httprequest.html
	_http = HTTPRequest.new()
	add_child(_http)
	_http.request_completed.connect(_on_request_completed)
	# senha/senharep saíram do `check`: agora são OPCIONAIS (login = email + CPF).
	check = [nome,email,telefone,cpf,nomehorta,endereco_rua,endereco_numero,endereco_cep,endereco_bairro,endereco_cidade,endereco_uf,comunidade,area_total,canteiros]
	limpar.pressed.connect(_limpar_dados)

func _limpar_dados():
	for i in check:
		i.text = ""
	# senha/senharep não estão mais em `check`, mas seguem limpos na UI.
	senha.text = ""
	senharep.text = ""

func _checar_os_dados() ->bool:
	var lugares:Array
	for i in check:
		if i.text.length()<1:
			lugares.append(i)
	if lugares.size()>0:
		_emitir_erro("Todos os dados devem ser preenchidos!",0,lugares)
		return false
	if cpf.text.length()<cpf.max_length:
		_emitir_erro("O CPF deve ter 11 dígitos. Caso não tenha, adicionar zeros a esquerda!") #Adicionar automaticamente
		return false
	# Senha é OPCIONAL e NÃO vai à API (o backend define senha = CPF).
	# Só validamos se o usuário tiver preenchido algo.
	if senha.text.length() > 0:
		if senha.text.length()<8:
			_emitir_erro("A senha deve ter pelo menos 8 e no máximo 14 digitos.")
			return false
		if senha.text != senharep.text:
			_emitir_erro("A repetição da senha não confere com a senha.")
			return false
	return true

func _checar_os_dados_e_enviar():
	if _checar_os_dados():
		_registrar()

func _emitir_erro(mensagem:String,qual:int=0,aux=""):
	if qual == 0:
		if aux is Array:
			for i in aux:
				i.modulate = Color(1.0, 0.213, 0.16, 1.0)
		erro_timer.start()
	log.modulate = Color(1.0, 0.302, 0.286, 1.0)
	log.text = mensagem
	log.show()

func _emitir_log(mensagem:String):
	log.modulate = Color(0.043, 0.247, 0.8, 1.0)
	log.text = mensagem
	log.show()
	erro_timer.start()

func _clear_error():
	for i in check:
		i.modulate = Color(1,1,1)
	await get_tree().create_timer(3.5).timeout
	log.hide()
	
func _so_digitos(texto:String) -> String:
	# Mantém apenas dígitos (o backend valida o CPF como 11 dígitos).
	var saida := ""
	for c in texto:
		if c >= "0" and c <= "9":
			saida += c
	return saida

func _registrar():
	# Token vem de Engine/Login.gd (POST /token), guardado no singleton Sessao.
	if not Sessao.tem_token():
		_emitir_erro("Sessão expirada. Faça login novamente.")
		return

	# area_total é OBRIGATÓRIO e numérico no schema HortaCreate
	# (app/schemas/horta.py — area_total: float).
	# String.is_valid_float / to_float:
	# docs.godotengine.org/en/stable/classes/class_string.html
	var area_txt := area_total.text.strip_edges()
	if not area_txt.is_valid_float():
		_emitir_erro("A área total deve ser um número.", 0, [area_total])
		return
	var area := area_txt.to_float()
	if area <= 0:
		_emitir_erro("A área total deve ser maior que zero.", 0, [area_total])
		return

	# Payload PLANO no formato de HortaRegistroCreate (horta + lider).
	# Campos do form que NÃO entram no payload: senha/senharep (login = email + CPF;
	# senha definida pelo backend), canteiros (criados depois, em outra tela),
	# pubemail/pubtelefone (sem campo equivalente no schema).
	# TODO: geocodificar endereço ou coletar lat/lng (mapa) — sem coordenadas a
	# horta não aparece no mapa.
	var payload := {
		"horta": {
			"nome": nomehorta.text,
			"rua": endereco_rua.text,
			"numero": endereco_numero.text,
			"bairro": endereco_bairro.text,
			"cep": endereco_cep.text,
			"cidade": endereco_cidade.text,
			"uf": endereco_uf.text,
			"area_total": area,
			"publico_atendido": comunidade.text,
		},
		"lider": {
			"nome": nome.text,
			"email": email.text,
			"cpf": _so_digitos(cpf.text),
			"telefone": telefone.text,
		},
	}

	var headers = PackedStringArray([
		"Content-Type: application/json",
		Sessao.cabecalho_auth(),  # "Authorization: Bearer <token>"
	])

	registrar.disabled = true
	_emitir_log("Enviando…")
	_http.request(URL_API + "/hortas/registro", headers, HTTPClient.METHOD_POST, JSON.stringify(payload))

func _on_request_completed(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	registrar.disabled = false

	if result != HTTPRequest.RESULT_SUCCESS:
		_emitir_erro("Erro de rede. Verifique a conexão com o servidor.")
		return

	if response_code == 201:
		_emitir_log("Cadastro realizado com sucesso!")
		_limpar_dados()
	elif response_code == 401:
		_emitir_erro("Sessão expirada. Faça login novamente.")
	elif response_code == 409:
		# Backend retorna "detail" (ex.: "Este CPF já está cadastrado.",
		# "Este Email já está cadastrado.") — ver app/api/routes/hortas.py.
		var dados = JSON.parse_string(body.get_string_from_utf8())
		var detalhe := "Registro já existente."
		if dados is Dictionary and dados.has("detail"):
			detalhe = str(dados["detail"])
		var campos := []
		var minusculo := detalhe.to_lower()
		if minusculo.contains("cpf"):
			campos = [cpf]
		elif minusculo.contains("email"):
			campos = [email]
		_emitir_erro(detalhe, 0, campos)
	elif response_code == 422:
		push_warning("422 do servidor em /hortas/registro: " + body.get_string_from_utf8())
		_emitir_erro("Dados inválidos. Verifique os campos.")
	else:
		_emitir_erro("Erro do servidor (código %d)." % response_code)
