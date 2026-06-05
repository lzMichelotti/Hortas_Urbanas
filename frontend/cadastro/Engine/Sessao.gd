extends Node

var access_token: String = ""
var token_type: String = "bearer"

func tem_token() -> bool:
	return access_token.length() > 0

func cabecalho_auth() -> String:
	return "Authorization: %s %s" % [token_type.capitalize(), access_token]
