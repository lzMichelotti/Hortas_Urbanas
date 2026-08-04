"""Testes de integração do painel da administração — requer TEST_DATABASE_URL."""
from datetime import date, timedelta

import pytest

from app.core.security import get_password_hash
from app.database.models import Canteiro, CicloProducao, Demanda, Horta, Produto, Usuario

pytestmark = pytest.mark.integration

HOJE = date.today()


def _usuario(db, *, nome, email, cpf, privilegio, horta_id=None, **dados):
    u = Usuario(
        nome=nome,
        email=email,
        cpf=cpf,
        senha_hash=get_password_hash(cpf),
        telefone="11999990000",
        privilegio=privilegio,
        horta_id=horta_id,
        ativo=True,
        **dados,
    )
    db.add(u)
    db.commit()
    return u


@pytest.fixture
def cenario(db):
    """Duas hortas: a A produzindo, a B vazia e sem líder."""
    horta_a = Horta(nome="Horta A", area_total=100.0, ativo=True)
    horta_b = Horta(nome="Horta B", area_total=50.0, ativo=True)
    db.add_all([horta_a, horta_b])
    db.commit()

    lider = _usuario(
        db, nome="Líder A", email="lider@a.com", cpf="33333333333",
        privilegio="LIDER_HORTA", horta_id=horta_a.id,
    )
    membro = _usuario(
        db, nome="Membro A", email="membro@a.com", cpf="44444444444",
        privilegio="MEMBRO_CANTEIRO", horta_id=horta_a.id,
    )

    c1 = Canteiro(
        horta_id=horta_a.id, usuario_id=membro.id, identificacao="C1", numero=1,
        area_produtiva=10.0, area_ociosa=2.0, ativo=True,
    )
    c2 = Canteiro(
        horta_id=horta_a.id, identificacao="C2", numero=2,
        area_produtiva=5.0, area_ociosa=3.0, ativo=True,
    )
    c3 = Canteiro(horta_id=horta_b.id, identificacao="C3", numero=1, ativo=True)
    db.add_all([c1, c2, c3])

    alface = Produto(nome="Alface", categoria="folhosa", ativo=True)
    db.add(alface)
    db.commit()

    db.add_all([
        CicloProducao(
            canteiro_id=c1.id, produto_id=alface.id, status="PLANTADO",
            data_plantio=HOJE, previsao_colheita=HOJE + timedelta(days=30), ativo=True,
        ),
        CicloProducao(
            canteiro_id=c1.id, produto_id=alface.id, status="COLHIDO",
            data_plantio=HOJE - timedelta(days=30), previsao_colheita=HOJE - timedelta(days=1),
            data_colheita_real=HOJE, ativo=True,
        ),
        CicloProducao(
            canteiro_id=c1.id, produto_id=alface.id, status="PERDIDO",
            data_plantio=HOJE - timedelta(days=20), previsao_colheita=HOJE + timedelta(days=10),
            motivo_perda="GEADA", perdido_em=HOJE, ativo=True,
        ),
        CicloProducao(
            canteiro_id=c1.id, produto_id=alface.id, status="PERDIDO",
            data_plantio=HOJE - timedelta(days=20), previsao_colheita=HOJE + timedelta(days=10),
            motivo_perda="PRAGA", perdido_em=HOJE, ativo=True,
        ),
    ])
    db.commit()
    return {"horta_a": horta_a, "horta_b": horta_b, "lider": lider, "membro": membro}


@pytest.fixture
def lider_headers(client, cenario):
    r = client.post("/token", data={"username": "lider@a.com", "password": "33333333333"})
    assert r.status_code == 200, r.json()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


class TestPermissao:
    @pytest.mark.parametrize(
        "rota",
        ["/painel/admin/panorama", "/painel/admin/producao", "/painel/admin/horticultores"],
    )
    def test_lider_nao_acessa(self, client, lider_headers, rota):
        assert client.get(rota, headers=lider_headers).status_code == 403

    def test_sem_token_nao_acessa(self, client):
        assert client.get("/painel/admin/panorama").status_code == 401


class TestPanorama:
    def test_conta_hortas_canteiros_e_areas(self, client, admin_headers, cenario):
        r = client.get("/painel/admin/panorama", headers=admin_headers)
        assert r.status_code == 200, r.json()
        body = r.json()

        assert body["hortas"] == {"ativas": 2, "sem_lider": 1, "paradas": 1}
        assert body["canteiros"] == {
            "ativos": 3, "com_responsavel": 1, "ociosos": 2,
            "area_produtiva_m2": 15.0, "area_ociosa_m2": 5.0,
        }
        assert body["pessoas"] == {"membros": 1, "lideres": 1}

    def test_separa_perda_climatica_das_demais(self, client, admin_headers, cenario):
        producao = client.get("/painel/admin/panorama", headers=admin_headers).json()["producao"]
        assert producao == {
            "plantios": 4, "colheitas": 1, "perdas": 2, "perdas_climaticas": 1,
        }

    def test_ignora_horta_removida(self, client, admin_headers, cenario, db):
        cenario["horta_b"].ativo = False
        db.commit()
        body = client.get("/painel/admin/panorama", headers=admin_headers).json()
        assert body["hortas"]["ativas"] == 1
        assert body["canteiros"]["ativos"] == 2

    def test_conta_so_demanda_encaminhada_a_administracao(self, client, admin_headers, cenario, db):
        canteiro = db.query(Canteiro).filter(Canteiro.numero == 1).first()
        db.add_all([
            Demanda(
                horta_id=cenario["horta_a"].id, tipo_demanda="material",
                descricao="Adubo", quantidade=2, unidade_medida="saco", status="ABERTA",
            ),
            Demanda(
                horta_id=cenario["horta_a"].id, canteiro_id=canteiro.id, tipo_demanda="material",
                descricao="Semente", quantidade=1, unidade_medida="pacote", status="ABERTA",
            ),
        ])
        db.commit()

        demandas = client.get("/painel/admin/panorama", headers=admin_headers).json()["demandas"]
        assert demandas == {"abertas": 1, "em_atendimento": 0}

    def test_etag_devolve_304(self, client, admin_headers, cenario):
        primeira = client.get("/painel/admin/panorama", headers=admin_headers)
        etag = primeira.headers["ETag"]
        segunda = client.get(
            "/painel/admin/panorama", headers={**admin_headers, "If-None-Match": etag}
        )
        assert segunda.status_code == 304


class TestProducao:
    def test_serie_mensal_usa_a_data_de_cada_evento(self, client, admin_headers, cenario):
        r = client.get("/painel/admin/producao", headers=admin_headers)
        assert r.status_code == 200, r.json()
        body = r.json()

        mes_atual = HOJE.strftime("%Y-%m")
        ponto = next(p for p in body["serie_mensal"] if p["mes"] == mes_atual)
        # O ciclo colhido foi plantado há 30 dias: só a colheita cai no mês corrente.
        assert ponto["colheitas"] == 1
        assert ponto["perdas"] == 2
        assert sum(p["plantios"] for p in body["serie_mensal"]) == 4

    def test_por_horta_traz_horta_sem_ciclo_de_fora(self, client, admin_headers, cenario):
        body = client.get("/painel/admin/producao", headers=admin_headers).json()
        nomes = {h["nome"] for h in body["por_horta"]}
        assert nomes == {"Horta A"}

    def test_marca_quais_motivos_sao_climaticos(self, client, admin_headers, cenario):
        body = client.get("/painel/admin/producao", headers=admin_headers).json()
        por_motivo = {p["motivo"]: p for p in body["perdas_por_motivo"]}
        assert por_motivo["GEADA"]["climatico"] is True
        assert por_motivo["PRAGA"]["climatico"] is False

    def test_produto_aparece_com_plantios_e_perdas(self, client, admin_headers, cenario):
        body = client.get("/painel/admin/producao", headers=admin_headers).json()
        assert body["produtos"] == [
            {"produto_id": 1, "nome": "Alface", "plantios": 4, "perdas": 2}
        ]

    def test_periodo_invertido_retorna_422(self, client, admin_headers, cenario):
        r = client.get(
            "/painel/admin/producao",
            params={"desde": HOJE.isoformat(), "ate": (HOJE - timedelta(days=1)).isoformat()},
            headers=admin_headers,
        )
        assert r.status_code == 422

    def test_periodo_longo_demais_retorna_422(self, client, admin_headers, cenario):
        r = client.get(
            "/painel/admin/producao",
            params={"desde": (HOJE - timedelta(days=4000)).isoformat(), "ate": HOJE.isoformat()},
            headers=admin_headers,
        )
        assert r.status_code == 422

    def test_periodo_fora_da_janela_zera_contagens(self, client, admin_headers, cenario):
        r = client.get(
            "/painel/admin/producao",
            params={
                "desde": (HOJE - timedelta(days=400)).isoformat(),
                "ate": (HOJE - timedelta(days=300)).isoformat(),
            },
            headers=admin_headers,
        )
        assert r.json()["serie_mensal"] == []


class TestFichaDaHorta:
    def test_traz_lider_ocupacao_e_producao(self, client, admin_headers, cenario):
        r = client.get(f"/painel/admin/hortas/{cenario['horta_a'].id}", headers=admin_headers)
        assert r.status_code == 200, r.json()
        body = r.json()

        assert body["horta"]["nome"] == "Horta A"
        assert body["lider"]["nome"] == "Líder A"
        assert body["membros"] == 1
        assert body["canteiros"]["ativos"] == 2
        assert body["canteiros"]["ociosos"] == 1
        assert body["producao"]["plantios"] == 4
        assert body["ultima_atividade"] == HOJE.isoformat()

    def test_horta_vazia_nao_quebra(self, client, admin_headers, cenario):
        body = client.get(
            f"/painel/admin/hortas/{cenario['horta_b'].id}", headers=admin_headers
        ).json()
        assert body["lider"] is None
        assert body["ultima_atividade"] is None
        assert body["producao"]["plantios"] == 0

    def test_horta_inexistente_retorna_404(self, client, admin_headers, cenario):
        assert client.get("/painel/admin/hortas/9999", headers=admin_headers).status_code == 404


class TestHorticultores:
    @pytest.fixture
    def populacao(self, db):
        horta = Horta(nome="Horta C", area_total=10.0, ativo=True)
        db.add(horta)
        db.commit()

        for i in range(6):
            _usuario(
                db, nome=f"Branca {i}", email=f"b{i}@c.com", cpf=f"5000000000{i}",
                privilegio="MEMBRO_CANTEIRO", horta_id=horta.id,
                raca_cor="BRANCA", sexo="FEMININO",
                nascimento_ano=1950 + i, grupo_familiar=3,
            )
        for i in range(6):
            _usuario(
                db, nome=f"Parda {i}", email=f"p{i}@c.com", cpf=f"6000000000{i}",
                privilegio="MEMBRO_CANTEIRO", horta_id=horta.id,
                raca_cor="PARDA", sexo="MASCULINO",
                nascimento_ano=2000 + i, grupo_familiar=5,
            )
        _usuario(
            db, nome="Indígena", email="i@c.com", cpf="70000000000",
            privilegio="MEMBRO_CANTEIRO", horta_id=horta.id,
            raca_cor="INDIGENA", sexo="OUTRO", nascimento_ano=1990, grupo_familiar=4,
        )
        return horta

    def test_suprime_categoria_pequena_e_a_complementar(self, client, admin_headers, populacao):
        r = client.get("/painel/admin/horticultores", headers=admin_headers)
        assert r.status_code == 200, r.json()
        body = r.json()

        por_raca = {f["rotulo"]: f for f in body["raca_cor"]}
        assert por_raca["INDIGENA"] == {"rotulo": "INDIGENA", "n": None, "suprimido": True}
        # Uma célula sozinha seria dedutível por subtração: outra vai junto.
        suprimidas = [f for f in body["raca_cor"] if f["suprimido"]]
        assert len(suprimidas) >= 2
        assert por_raca["PRETA"] == {"rotulo": "PRETA", "n": 0, "suprimido": False}

    def test_agrega_faixa_etaria_e_grupo_familiar(self, client, admin_headers, populacao):
        body = client.get("/painel/admin/horticultores", headers=admin_headers).json()

        assert body["total"] == 13
        assert body["informaram"] == 13
        por_faixa = {f["rotulo"]: f["n"] for f in body["faixa_etaria"]}
        assert por_faixa["60_MAIS"] == 6          # nascidos em 1950-1955
        assert body["grupo_familiar_medio"] == pytest.approx(4.0, abs=0.1)
        assert body["alcance_estimado"] == 6 * 3 + 6 * 5 + 4

    def test_nao_devolve_dado_por_pessoa(self, client, admin_headers, populacao):
        corpo = client.get("/painel/admin/horticultores", headers=admin_headers).text
        assert "Indígena" not in corpo
        assert "i@c.com" not in corpo

    def test_sem_ninguem_cadastrado_devolve_zeros(self, client, admin_headers):
        body = client.get("/painel/admin/horticultores", headers=admin_headers).json()
        assert body["total"] == 0
        assert body["grupo_familiar_medio"] is None
        assert all(f["n"] == 0 for f in body["raca_cor"])
