extends PanelContainer

class_name ControleDoClima

@export var nome_da_cidade:Label
@export var temperatura:Label
@export var umidade_relativa:Label
@export var velocidade_do_vento:Label
@export var pressao:Label

var http_request: HTTPRequest
var api_key = "ce71a6908dbf03aaad54cffcaee805e2"
var latitude = "-29.6842" # Example: Los Angeles latitude
var longitude = "-53.8069" # Example: Los Angeles longitude

func _ready():
	http_request = HTTPRequest.new()
	add_child(http_request)
	http_request.request_completed.connect(self._on_request_completed)
	var url = "https://api.openweathermap.org/data/2.5/weather?lat="+latitude+"&lon="+longitude+"&appid="+api_key
	#var url = "https://api.openweathermap.org/data/3.0/onecall?lat="+latitude+"&lon="+longitude+"&exclude=hourly,daily&appid="+api_key
	http_request.request(url)

func _on_request_completed(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray):
	if response_code == 200:
		var json_data = JSON.parse_string(body.get_string_from_utf8())
		if json_data:
			print("Weather data received:", json_data)
			nome_da_cidade.text = "Informações sobre o tempo:\n"+json_data["name"]
			temperatura.text = "%.2fº"%(json_data["main"]["temp"]-273.15)#str(json_data["main"]["temp"]-273.15)+"º"
			umidade_relativa.text=str(json_data["main"]["humidity"])+"%"
			velocidade_do_vento.text=str(json_data["wind"]["speed"])+"km/h"
			pressao.text = str(json_data["main"]["pressure"])+"pa"
				# Process the weather data to update your game's environment
		else:
			print("Failed to parse JSON response.")
	else:
		print("HTTP Request failed with code:", response_code)
