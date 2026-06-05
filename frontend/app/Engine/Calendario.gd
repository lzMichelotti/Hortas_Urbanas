extends PanelContainer

class_name CalendarioDaHorta

@export var container_dos_dias:GridContainer
@export var mes:Label
@export var avancar_mes:Button
@export var voltar_mes:Button

signal data_escolhida

var dias_da_semana:Array[String]=["Dom","Seg","Ter","Qua","Qui","Sex","Sab"]
var meses:Array[String]=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
var current_month:int
var current_year:int
var hoje:Dictionary
var disabled:ColorRect

func _ready() -> void:
	disabled = ColorRect.new()
	disabled.color = Color(0.0, 0.0, 0.0, 0.604)
	add_child(disabled)
	hoje = Time.get_date_dict_from_system()
	current_month = Time.get_date_dict_from_system()["month"]
	current_year = Time.get_date_dict_from_system()["year"]
	avancar_mes.pressed.connect(_trocar_mes.bind("+"))
	voltar_mes.pressed.connect(_trocar_mes.bind("-"))
	_create_calendar()

func _trocar_mes(k:String):
	if k == "+":
		current_month = current_month + 1
		if current_month>12:
			current_month = 1
			current_year = current_year+1
	else:
		current_month = current_month - 1
		if current_month<1:
			current_month = 12
			current_year = current_year-1
	_create_calendar()

func _create_calendar():
	for i in container_dos_dias.get_children():
		if i is Button:
			i.queue_free()
	var calendario = Calendar.new()
	var dias = calendario.get_days_of_range(31,current_year,current_month,1)
	mes.text = meses[current_month-1]+" "+str(current_year)
#	print(dias,dias[0].day)
	var trocou_o_mes = false
	for i in range(dias.size()):
		if i==0:
			for j in range(dias[0].get_weekday()):
				var nothing = Button.new()
				nothing.focus_mode=Control.FOCUS_NONE
				nothing.flat = true
				nothing.disabled = true
				container_dos_dias.add_child(nothing)
		if i>0 && dias[i].day==1:
			trocou_o_mes = true
		if !trocou_o_mes:
			var new_button = Button.new()
			new_button.focus_mode=Control.FOCUS_NONE
			new_button.custom_minimum_size = Vector2(64,64)
			new_button.text = str(dias[i].day)
			if dias[i].day == hoje["day"] && current_year==hoje["year"] && current_month==hoje["month"]:
				new_button.self_modulate = Color(0.0, 0.527, 0.0, 1.0)
			new_button.pressed.connect(_dia_selecionado.bind(dias[i].day,current_month,current_year))
			container_dos_dias.add_child(new_button)
			var confere_colheita=que_dia_eh_esse({"dia":dias[i].day,"mes":current_month,"ano":current_year})
			if Dados.produtos_em_producao.has(confere_colheita):
				new_button.icon = load("res://assets/placeholders/colher.png")
				new_button.icon_alignment=HORIZONTAL_ALIGNMENT_CENTER
			#print(dias[i].day," ",dias_da_semana[dias[i].get_weekday()])

func _dia_selecionado(dd:int,mm:int,yy:int):
	#print(dd,"/",mm,"/",yy)
	emit_signal("data_escolhida",{"dia":dd,"mes":mm,"ano":yy})

func disable_calendar():
	disabled.show()
	
func enable_calendar():
	disabled.hide()

func que_dia_eh_esse(dia:Dictionary) -> String:
	return str(dia["dia"])+" de "+meses[dia["mes"]-1]+" de "+str(dia["ano"])
	
func qual_dia_vai_ser(dia_inicial:Dictionary,periodo:Array):
	var calendario = Calendar.new()
	var dias = calendario.get_days_of_range(periodo[0]+1,dia_inicial["ano"],dia_inicial["mes"],dia_inicial["dia"])
	return {"dia":dias[dias.size()-1].day,"mes":dias[dias.size()-1].month,"ano":dias[dias.size()-1].year}

func atualizar():
	Dados.produtos_em_producao.clear()
	for ciclo in Sessao.ciclos:
		var partes = str(ciclo.get("previsao_colheita","")).split("-")
		if partes.size() != 3:
			continue
		var chave = que_dia_eh_esse({"dia":int(partes[2]),"mes":int(partes[1]),"ano":int(partes[0])})
		Dados.produtos_em_producao[chave] = {}
	_create_calendar()
