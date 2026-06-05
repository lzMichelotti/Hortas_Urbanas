extends Control

class_name MenuPrincipal

@export_category("Definições básicas")
@export var nome_da_horta:Label
@export_category("Funcionalidades")
@export var registrar_producao:TextureButton
@export var registrar_entrada_de_insumos:TextureButton
@export var registrar_saida_de_producao:TextureButton
@export var estatisticas:TextureButton
@export var comunidade:TextureButton
@export_category("Configurações")
@export var configuracoes_do_app:TextureButton
@export var sobre_o_app:TextureButton
@export var fechar_o_app:TextureButton

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	registrar_producao.pressed.connect(_menu_producao)
	fechar_o_app.pressed.connect(get_tree().quit)

func _menu_producao():
	var novo_menu = load("res://Lab/menu_producao.tscn").instantiate()
	add_sibling(novo_menu)
	queue_free()
# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(_delta: float) -> void:
	pass
