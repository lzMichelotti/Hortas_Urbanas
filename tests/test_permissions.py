"""Testes unitários das funções de permissão — sem banco de dados."""
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.api.permissions import (
    exigir_acesso_horta,
    exigir_dono_do_canteiro,
    exigir_lider_da_horta,
    exigir_lider_pode_criar_usuario,
    horta_id_visivel,
)


def _usuario(privilegio: str, horta_id: int | None = 1, id: int = 1):
    u = MagicMock()
    u.privilegio = privilegio
    u.horta_id = horta_id
    u.id = id
    return u


def _canteiro(usuario_id: int | None = 1, horta_id: int = 1):
    c = MagicMock()
    c.usuario_id = usuario_id
    c.horta_id = horta_id
    return c


class TestExigirAcessoHorta:
    def test_admin_supremo_pode_qualquer_horta(self):
        exigir_acesso_horta(_usuario("ADMIN_SUPREMO", horta_id=None), 99)

    def test_lider_propria_horta(self):
        exigir_acesso_horta(_usuario("LIDER_HORTA", horta_id=5), 5)

    def test_lider_outra_horta_levanta_403(self):
        with pytest.raises(HTTPException) as exc:
            exigir_acesso_horta(_usuario("LIDER_HORTA", horta_id=5), 99)
        assert exc.value.status_code == 403

    def test_membro_propria_horta(self):
        exigir_acesso_horta(_usuario("MEMBRO_CANTEIRO", horta_id=3), 3)

    def test_membro_outra_horta_levanta_403(self):
        with pytest.raises(HTTPException) as exc:
            exigir_acesso_horta(_usuario("MEMBRO_CANTEIRO", horta_id=3), 7)
        assert exc.value.status_code == 403


class TestExigirLiderDaHorta:
    def test_admin_supremo_isento(self):
        exigir_lider_da_horta(_usuario("ADMIN_SUPREMO", horta_id=None), 42)

    def test_lider_propria_horta(self):
        exigir_lider_da_horta(_usuario("LIDER_HORTA", horta_id=10), 10)

    def test_lider_outra_horta_levanta_403(self):
        with pytest.raises(HTTPException) as exc:
            exigir_lider_da_horta(_usuario("LIDER_HORTA", horta_id=10), 99)
        assert exc.value.status_code == 403


class TestHortaIdVisivel:
    def test_admin_supremo_retorna_none(self):
        assert horta_id_visivel(_usuario("ADMIN_SUPREMO", horta_id=None)) is None

    def test_lider_retorna_proprio_horta_id(self):
        assert horta_id_visivel(_usuario("LIDER_HORTA", horta_id=7)) == 7

    def test_membro_retorna_none(self):
        # MEMBRO_CANTEIRO não tem filtro de visibilidade por horta nesta função
        # (suas restrições são aplicadas via exigir_acesso_horta por endpoint)
        assert horta_id_visivel(_usuario("MEMBRO_CANTEIRO", horta_id=2)) is None


class TestExigirDonoDoCanteiro:
    def test_admin_supremo_isento(self):
        exigir_dono_do_canteiro(_usuario("ADMIN_SUPREMO", id=1), _canteiro(usuario_id=99))

    def test_lider_horta_isento(self):
        exigir_dono_do_canteiro(_usuario("LIDER_HORTA", id=2), _canteiro(usuario_id=99))

    def test_membro_dono_pode(self):
        exigir_dono_do_canteiro(_usuario("MEMBRO_CANTEIRO", id=5), _canteiro(usuario_id=5))

    def test_membro_nao_dono_levanta_403(self):
        with pytest.raises(HTTPException) as exc:
            exigir_dono_do_canteiro(_usuario("MEMBRO_CANTEIRO", id=5), _canteiro(usuario_id=999))
        assert exc.value.status_code == 403


class TestExigirLiderPodeCriarUsuario:
    def test_admin_supremo_pode_criar_qualquer_privilegio(self):
        admin = _usuario("ADMIN_SUPREMO")
        for priv in ["ADMIN_SUPREMO", "LIDER_HORTA", "MEMBRO_CANTEIRO"]:
            exigir_lider_pode_criar_usuario(admin, priv)

    def test_lider_pode_criar_membro(self):
        exigir_lider_pode_criar_usuario(_usuario("LIDER_HORTA"), "MEMBRO_CANTEIRO")

    def test_lider_nao_pode_criar_outro_lider(self):
        with pytest.raises(HTTPException) as exc:
            exigir_lider_pode_criar_usuario(_usuario("LIDER_HORTA"), "LIDER_HORTA")
        assert exc.value.status_code == 403

    def test_lider_nao_pode_criar_admin(self):
        with pytest.raises(HTTPException) as exc:
            exigir_lider_pode_criar_usuario(_usuario("LIDER_HORTA"), "ADMIN_SUPREMO")
        assert exc.value.status_code == 403
