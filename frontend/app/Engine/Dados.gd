extends Node
# Cadastrar os produtos por data de plantio

# Organizar na data: Qual produto, quantidade, espectativa de colheita

# Existe espectativa de colheita fixa? Se sim, comparar a data esperada com
# a data que ocorreu a colheita
#var hortalicas:Dictionary = {"alface":load("res://hortalicas/Alface.tres")}

var insumos:Array = [["res://hortalicas/Alface_inverno.tres",999],
					 ["res://hortalicas/Abobora.tres",999],
					 ["res://hortalicas/Batata.tres",999],
					 ["res://hortalicas/Tomate.tres",999]]
									
var exemplo_de_entrada:Dictionary = {"10/02/2026":
									{"Produto A":
												{"quantidade":0,
												"localizacao":0,
												"Data esperada da colheita":"10/10/2026"}}}
var dias_de_colheita:Dictionary
var produtos_em_producao:Dictionary
var saida_de_produto:Dictionary={"aface":{"quantidade":0},
									"tomate":{"quantidade":0},
									"tempero verde":{"quantidade":0}}
# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(_delta: float) -> void:
	pass
