extends PanelContainer

class_name ItemDaHorta
@export var hortalica:Hortalica
var botao:TextureButton
var nome:Label
var caixa_vertical:VBoxContainer
var dia_registrado:int
var tempo_restante:int

signal escolhido

func _ready() -> void:
	#hortalica = Dados.hortalicas["alface"]
	theme = load("res://assets/temas/Hortalicas.tres")
	custom_minimum_size=Vector2(330,330)
	caixa_vertical = VBoxContainer.new()
	caixa_vertical.alignment=BoxContainer.ALIGNMENT_CENTER
	add_child(caixa_vertical)
	nome = Label.new()
	nome.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	nome.text = hortalica.nome
	nome.add_theme_font_size_override("font_size",40)
	caixa_vertical.add_child(nome)
	botao = TextureButton.new()
	botao.size_flags_horizontal=Control.SIZE_SHRINK_CENTER
	botao.custom_minimum_size=Vector2(128,128)
	botao.stretch_mode=TextureButton.STRETCH_KEEP_ASPECT
	botao.texture_normal = hortalica.figura
	caixa_vertical.add_child(botao)
	botao.pressed.connect(_escolhi)
	
func _escolhi():
	emit_signal("escolhido")
