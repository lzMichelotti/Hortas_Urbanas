extends Control


@export var container_de_hortalicas:GridContainer
@export var calendario:CalendarioDaHorta
@export var resumo:RichTextLabel
@export var caixa_de_confirmacao:HBoxContainer
@export var confirmar:TextureButton
@export var cancelar:TextureButton
@export var voltar:TextureButton
@export var aviso_de_erro:ColorRect
@export var maxima_quantidade:Label

@export var paineis:Array[VBoxContainer]
@export var confirmar_hortalica:TextureButton
@export var confirmar_calendario:TextureButton

@export var calculadora:GridContainer
@export var visor:Label

var hortalica:Hortalica
var dia_do_plantio:Dictionary
var quantidade:int
var selecionada:String
var _idempotency_key:String = ""


func _ready() -> void:
	if not Sessao.tem_token():
		get_tree().change_scene_to_file("res://Lab/login.tscn")
		return
	for i in paineis:
		i.hide()
	paineis[0].show()
	aviso_de_erro.hide()
	confirmar.hide()
	confirmar.pressed.connect(_confirma_plantio)
	cancelar.pressed.connect(_menu_producao)
	voltar.pressed.connect(_voltar_um_passo)
	resumo.text = "Plantar"
	dia_do_plantio = _hoje()
	calendario.data_escolhida.connect(_data_escolhida)
	_update_caixa_de_hortalicas()
	_update_calculadora()
	calendario.enable_calendar()
	confirmar_hortalica.pressed.connect(_confirmar_hortalica)
	confirmar_calendario.pressed.connect(_confirmar_calendario)
	_carregar_remoto()


func _carregar_remoto() -> void:
	await Sessao.garantir_produtos()
	await Sessao.garantir_ciclos()
	if not is_inside_tree():
		return
	calendario.atualizar()


# --- Navegação entre os passos (hortaliça → quantidade → data → confirmar) ---

func _voltar_um_passo():
	var voltou = false
	for i in range(paineis.size()):
		if paineis[i].visible:
			confirmar.hide()
			paineis[i-1].show()
			paineis[i].hide()
			if i-1 == 0:
				voltar.hide()
			voltou = true
			break
	if !voltou:
		confirmar.hide()
		paineis[paineis.size()-1].show()

func _confirmar_hortalica():
	voltar.show()
	paineis[0].hide()
	paineis[1].show()

func _confirmar_quantidade():
	paineis[2].show()
	paineis[1].hide()

func _confirmar_calendario():
	paineis[2].hide()
	confirmar.show()


# --- Calculadora de quantidade ---

func _update_calculadora():
	for i in calculadora.get_children():
		if i is Button:
			if i.name.is_valid_int():
				i.text = i.name
				i.pressed.connect(_colocar_numero.bind(i.text))
			elif i.name == "volta":
				i.pressed.connect(_colocar_numero.bind("-"))
			else:
				i.pressed.connect(_confirmar_quantidade)

func _colocar_numero(numero:String):
	if numero == "-":
		visor.text = visor.text.erase(visor.text.length()-1, 1)
	else:
		visor.text = visor.text + numero
	quantidade = int(visor.text)
	_idempotency_key = ""
	_update_resumo()


# --- Lista de hortaliças ---

func _update_caixa_de_hortalicas():
	for i in container_de_hortalicas.get_children():
		i.queue_free()
	for insumo in Dados.insumos:
		if insumo[1] > 0:
			var item = ItemDaHorta.new()
			item.hortalica = load(insumo[0])
			item.escolhido.connect(_hortalica_escolhida.bind(item.hortalica))
			container_de_hortalicas.add_child(item)

func _hortalica_escolhida(_hortalica:Hortalica):
	voltar.hide()
	caixa_de_confirmacao.show()
	hortalica = _hortalica
	_idempotency_key = ""
	maxima_quantidade.text = "Quantidade a plantar"
	_update_resumo()
	calendario.enable_calendar()

func _data_escolhida(data:Dictionary):
	dia_do_plantio = data
	_idempotency_key = ""
	_update_resumo()

func _update_resumo():
	if hortalica is Hortalica:
		resumo.text = "Plantar [color=green]%d %s[/color] em [color=yellow]%s" % [
			quantidade, hortalica.nome, calendario.que_dia_eh_esse(dia_do_plantio)
		]


# --- Envio do plantio (POST /canteiros/{id}/ciclos) ---

func _confirma_plantio():
	if not (hortalica is Hortalica) or quantidade < 1:
		_feedback("Escolha a hortaliça e informe a quantidade.", Color.ORANGE)
		return

	var produto_id = await _resolver_produto_id(hortalica.nome)
	if produto_id == 0:
		return

	_garantir_chave()
	confirmar.disabled = true
	_feedback("Enviando plantio…", Color.YELLOW)
	var resposta = await Sessao.criar_ciclo(_montar_corpo(produto_id), _idempotency_key)
	if not is_inside_tree():
		return
	confirmar.disabled = false
	_tratar_resposta(resposta)

func _resolver_produto_id(nome:String) -> int:
	var produto_id := int(Sessao.produto_id_por_nome.get(nome, 0))
	if produto_id > 0:
		return produto_id
	_feedback("Carregando catálogo…", Color.YELLOW)
	var ok = await Sessao.garantir_produtos()
	if not is_inside_tree():
		return 0
	if not ok:
		_feedback("Sem conexão para carregar o catálogo. Tente novamente.", Color.ORANGE_RED)
		return 0
	produto_id = int(Sessao.produto_id_por_nome.get(nome, 0))
	if produto_id == 0:
		_feedback("Produto '%s' não encontrado no catálogo." % nome, Color.ORANGE_RED)
	return produto_id

func _montar_corpo(produto_id:int) -> Dictionary:
	var colheita = calendario.qual_dia_vai_ser(dia_do_plantio, hortalica.tempo_de_colheita)
	return {
		"produto_id": produto_id,
		"data_plantio": _iso(dia_do_plantio),
		"previsao_colheita": _iso(colheita),
		"status": "PLANTADO",
		"quantidade": quantidade,
	}

func _tratar_resposta(r:Dictionary) -> void:
	if r.ok:
		_idempotency_key = ""
		calendario.atualizar()
		_cancela_plantio()
		_feedback("Plantio registrado!", Color.LIGHT_GREEN)
		return
	if r.code == 401:
		Sessao.limpar()
		get_tree().change_scene_to_file("res://Lab/login.tscn")
		return
	_feedback(_mensagem_erro(r.code), Color.ORANGE_RED)

func _mensagem_erro(code:int) -> String:
	match code:
		403:
			return "Você só pode plantar no seu próprio canteiro."
		422:
			return "Dados do plantio inválidos."
		0:
			return "Sem conexão. Toque em confirmar para tentar de novo."
		_:
			return "Erro do servidor (código %d)." % code

func _cancela_plantio():
	voltar.show()
	caixa_de_confirmacao.hide()
	resumo.text = ""
	hortalica = null
	_idempotency_key = ""
	calendario.disable_calendar()
	visor.text = "0"
	quantidade = 0
	maxima_quantidade.text = "Quantidade"
	dia_do_plantio = _hoje()


# --- Auxiliares ---

func _hoje() -> Dictionary:
	var d = Time.get_date_dict_from_system()
	return {"dia": d["day"], "mes": d["month"], "ano": d["year"]}

func _iso(d:Dictionary) -> String:
	return "%04d-%02d-%02d" % [int(d["ano"]), int(d["mes"]), int(d["dia"])]

func _garantir_chave() -> void:
	if _idempotency_key == "":
		_idempotency_key = Api.gerar_uuid()

func _feedback(mensagem:String, cor:Color) -> void:
	resumo.text = "[center][color=#%s]%s[/color][/center]" % [cor.to_html(false), mensagem]

func _menu_producao():
	var menu = load("res://Lab/menu_producao.tscn").instantiate()
	add_sibling(menu)
	queue_free()
