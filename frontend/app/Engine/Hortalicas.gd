extends Resource
class_name Hortalica

enum mes {Janeiro,Fevereiro,Março,Abril,Maio,Junho,Julho,Agosto,Setembro,Outubro,Novembro,Dezembro,Ano_Todo}
enum estacao {Primavera, Verão, Outono, Inverno}
@export var nome:String
@export var figura:Texture2D
@export var epoca_recomendada_plantio:Array[mes]
@export var tempo_de_colheita:Array[int] #em dias
@export var colheita_mes:Array[mes]
@export var colheita_estacao:Array[estacao]
