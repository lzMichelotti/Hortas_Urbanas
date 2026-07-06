"""Testes unitários da validação de CPF (validate-docbr) — sem banco."""
import pytest
from pydantic import ValidationError
from validate_docbr import CPF

from app.schemas.usuario import UsuarioCreate

pytestmark = pytest.mark.unit

_cpf = CPF()


def _payload(cpf: str) -> dict:
    return {
        "nome": "Fulano",
        "email": "fulano@horta-urbana.com",
        "cpf": cpf,
        "telefone": "11999999999",
        "privilegio": "MEMBRO_CANTEIRO",
    }


class TestValidacaoCPF:
    @pytest.mark.parametrize("cpf", ["123", "abc", "00000000000", "11111111111", "12345678900"])
    def test_cpf_invalido_levanta_validation_error(self, cpf):
        with pytest.raises(ValidationError):
            UsuarioCreate(**_payload(cpf))

    def test_cpf_valido_e_aceito(self):
        valido = _cpf.generate()  # gera um CPF com dígitos verificadores corretos
        u = UsuarioCreate(**_payload(valido))
        assert u.cpf == valido

    def test_cpf_formatado_normalizado_para_digitos(self):
        valido = _cpf.generate()
        formatado = _cpf.mask(valido)  # ex.: "529.982.247-25"
        u = UsuarioCreate(**_payload(formatado))
        assert u.cpf == valido  # validador remove pontuação, guarda só dígitos
