extends Control

class_name MenuProducao

@export var registrar_plantio:TextureButton
@export var registrar_colheita:TextureButton
@export var voltar:TextureButton
@export var calendario:CalendarioDaHorta

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	voltar.pressed.connect(_menu_principal)
	registrar_plantio.pressed.connect(_plantio)
	calendario.enable_calendar()
	_atualizar_calendario()

func _atualizar_calendario() -> void:
	await Sessao.garantir_ciclos()
	if not is_inside_tree():
		return
	calendario.atualizar()

func _menu_principal():
	var menu_princilal = load("res://Lab/menu_principal.tscn").instantiate()
	add_sibling(menu_princilal)
	queue_free()

func _plantio():
	var rodar_plantio = load("res://Lab/adicionar_producao.tscn").instantiate()
	add_sibling(rodar_plantio)
	queue_free()
