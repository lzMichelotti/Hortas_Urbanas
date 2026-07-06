"""Testes de integração do fórum da comunidade — requer TEST_DATABASE_URL."""
from types import SimpleNamespace

import pytest

from app.core import storage
from app.core.config import settings
from app.core.security import get_password_hash
from app.database.models import Denuncia, Horta, PostImagem, Resposta, Usuario

pytestmark = pytest.mark.integration


@pytest.fixture
def fake_r2(monkeypatch):
    objetos: dict[str, dict] = {}

    monkeypatch.setattr(storage, "configurado", lambda: True)
    monkeypatch.setattr(storage, "gerar_presign_put", lambda key, ct: f"https://upload.test/{key}")
    monkeypatch.setattr(storage, "head_objeto", lambda key: objetos.get(key))
    monkeypatch.setattr(storage, "apagar_objeto", lambda key: objetos.pop(key, None))

    def upload(key, content_type="image/jpeg", tamanho=100_000):
        objetos[key] = {"tamanho": tamanho, "content_type": content_type}

    return SimpleNamespace(objetos=objetos, upload=upload)


def _add_imagem(client, headers, post_id, fake_r2, content_type="image/jpeg", tamanho=100_000):
    pre = client.post(
        f"/forum/posts/{post_id}/images/presign", headers=headers, json={"content_type": content_type}
    )
    assert pre.status_code == 200, pre.json()
    key = pre.json()["key"]
    fake_r2.upload(key, content_type, tamanho)
    conf = client.post(
        f"/forum/posts/{post_id}/images/confirm", headers=headers, json={"key": key}
    )
    return pre, conf


@pytest.fixture
def horta(db):
    h = Horta(nome="Horta Fórum", area_total=100.0, ativo=True)
    db.add(h)
    db.commit()
    return h


def _criar_usuario(db, nome, email, cpf, privilegio, horta_id):
    u = Usuario(
        nome=nome,
        email=email,
        cpf=cpf,
        senha_hash=get_password_hash(cpf),
        telefone="11666666666",
        privilegio=privilegio,
        horta_id=horta_id,
        ativo=True,
    )
    db.add(u)
    db.commit()
    return u


def _headers(client, email, senha):
    r = client.post("/token", data={"username": email, "password": senha})
    assert r.status_code == 200, r.json()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def ana(db, horta):
    return _criar_usuario(db, "Ana", "ana@f.com", "10000000001", "MEMBRO_CANTEIRO", horta.id)


@pytest.fixture
def ana_headers(client, ana):
    return _headers(client, "ana@f.com", "10000000001")


@pytest.fixture
def bruno(db, horta):
    return _criar_usuario(db, "Bruno", "bruno@f.com", "10000000002", "MEMBRO_CANTEIRO", horta.id)


@pytest.fixture
def bruno_headers(client, bruno):
    return _headers(client, "bruno@f.com", "10000000002")


@pytest.fixture
def carla_lider(db, horta):
    return _criar_usuario(db, "Carla", "carla@f.com", "10000000003", "LIDER_HORTA", horta.id)


@pytest.fixture
def carla_headers(client, carla_lider):
    return _headers(client, "carla@f.com", "10000000003")


def _criar_post(client, headers, conteudo="Olá comunidade"):
    r = client.post("/forum/posts", headers=headers, json={"conteudo": conteudo})
    assert r.status_code == 201, r.json()
    return r.json()


class TestLeituraPublica:
    def test_feed_vazio_publico(self, client):
        r = client.get("/forum/posts")
        assert r.status_code == 200
        assert r.json() == {"items": [], "proximo_cursor": None}

    def test_detalhe_publico_sem_login(self, client, ana_headers):
        post = _criar_post(client, ana_headers)
        r = client.get(f"/forum/posts/{post['id']}")
        assert r.status_code == 200
        assert r.json()["respostas"] == []

    def test_post_inexistente_404(self, client):
        assert client.get("/forum/posts/9999").status_code == 404


class TestCriacao:
    def test_criar_post_trima_e_retorna_autor(self, client, ana_headers):
        post = _criar_post(client, ana_headers, "  Minha planta está doente  ")
        assert post["conteudo"] == "Minha planta está doente"
        assert post["autor"]["nome"] == "Ana"
        assert post["respostas_count"] == 0

    def test_postar_exige_login(self, client):
        assert client.post("/forum/posts", json={"conteudo": "x"}).status_code == 401

    def test_conteudo_vazio_422(self, client, ana_headers):
        assert client.post("/forum/posts", headers=ana_headers, json={"conteudo": "   "}).status_code == 422

    def test_responder_e_contar(self, client, ana_headers, bruno_headers):
        post = _criar_post(client, ana_headers)
        r = client.post(f"/forum/posts/{post['id']}/respostas", headers=bruno_headers, json={"conteudo": "Tente neem."})
        assert r.status_code == 201
        assert r.json()["autor"]["nome"] == "Bruno"

        feed = client.get("/forum/posts").json()
        assert feed["items"][0]["respostas_count"] == 1
        detalhe = client.get(f"/forum/posts/{post['id']}").json()
        assert len(detalhe["respostas"]) == 1

    def test_responder_post_inexistente_404(self, client, ana_headers):
        assert client.post("/forum/posts/9999/respostas", headers=ana_headers, json={"conteudo": "x"}).status_code == 404


class TestTipoEHorta:
    def test_post_guarda_tipo_e_autor_tem_horta(self, client, ana_headers):
        r = client.post("/forum/posts", headers=ana_headers, json={"conteudo": "trago mudas", "tipo": "TROCAS"})
        assert r.status_code == 201
        body = r.json()
        assert body["tipo"] == "TROCAS"
        assert body["autor"]["horta"] == "Horta Fórum"

    def test_tipo_padrao_e_ajuda(self, client, ana_headers):
        assert _criar_post(client, ana_headers)["tipo"] == "AJUDA"

    def test_tipo_invalido_422(self, client, ana_headers):
        assert client.post("/forum/posts", headers=ana_headers, json={"conteudo": "x", "tipo": "OUTRO"}).status_code == 422

    def test_filtro_por_tipo(self, client, ana_headers):
        client.post("/forum/posts", headers=ana_headers, json={"conteudo": "preciso de ajuda", "tipo": "AJUDA"})
        client.post("/forum/posts", headers=ana_headers, json={"conteudo": "tenho mudas", "tipo": "TROCAS"})
        client.post("/forum/posts", headers=ana_headers, json={"conteudo": "mutirão sábado", "tipo": "AVISOS"})

        trocas = client.get("/forum/posts", params={"tipo": "TROCAS"}).json()["items"]
        assert [p["tipo"] for p in trocas] == ["TROCAS"]
        assert len(client.get("/forum/posts").json()["items"]) == 3


class TestPaginacao:
    def test_cursor_keyset_desc(self, client, ana_headers):
        ids = [_criar_post(client, ana_headers, f"post {i}")["id"] for i in range(3)]

        pg1 = client.get("/forum/posts", params={"limit": 2}).json()
        assert [it["id"] for it in pg1["items"]] == [ids[2], ids[1]]
        assert pg1["proximo_cursor"] == ids[1]

        pg2 = client.get("/forum/posts", params={"limit": 2, "cursor": pg1["proximo_cursor"]}).json()
        assert [it["id"] for it in pg2["items"]] == [ids[0]]
        assert pg2["proximo_cursor"] is None

    def test_limit_acima_do_maximo_422(self, client):
        assert client.get("/forum/posts", params={"limit": 999}).status_code == 422


class TestModeracao:
    def test_dono_apaga_seu_post(self, client, ana_headers):
        post = _criar_post(client, ana_headers)
        assert client.delete(f"/forum/posts/{post['id']}", headers=ana_headers).status_code == 204
        assert client.get(f"/forum/posts/{post['id']}").status_code == 404

    def test_membro_nao_apaga_post_alheio(self, client, ana_headers, bruno_headers):
        post = _criar_post(client, ana_headers)
        assert client.delete(f"/forum/posts/{post['id']}", headers=bruno_headers).status_code == 403

    def test_lider_modera_qualquer_post(self, client, ana_headers, carla_headers):
        post = _criar_post(client, ana_headers)
        assert client.delete(f"/forum/posts/{post['id']}", headers=carla_headers).status_code == 204

    def test_dono_apaga_sua_resposta_outro_nao(self, client, ana_headers, bruno_headers):
        post = _criar_post(client, ana_headers)
        resp = client.post(
            f"/forum/posts/{post['id']}/respostas", headers=bruno_headers, json={"conteudo": "minha resposta"}
        ).json()
        assert client.delete(f"/forum/respostas/{resp['id']}", headers=ana_headers).status_code == 403
        assert client.delete(f"/forum/respostas/{resp['id']}", headers=bruno_headers).status_code == 204

    def test_apagar_post_remove_respostas_e_denuncias_em_cascata(self, client, db, ana_headers, bruno_headers):
        post = _criar_post(client, ana_headers)
        client.post(f"/forum/posts/{post['id']}/respostas", headers=bruno_headers, json={"conteudo": "r"})
        client.post(f"/forum/posts/{post['id']}/denuncia", headers=bruno_headers, json={"motivo": "spam"})

        assert client.delete(f"/forum/posts/{post['id']}", headers=ana_headers).status_code == 204
        assert db.query(Resposta).count() == 0
        assert db.query(Denuncia).count() == 0


class TestCurtidas:
    def test_curtir_e_descurtir_alterna(self, client, ana_headers, bruno_headers):
        post = _criar_post(client, ana_headers)
        r = client.post(f"/forum/posts/{post['id']}/like", headers=bruno_headers)
        assert r.status_code == 200
        assert r.json() == {"likes_count": 1, "eu_curti": True}

        r = client.post(f"/forum/posts/{post['id']}/like", headers=bruno_headers)
        assert r.json() == {"likes_count": 0, "eu_curti": False}

    def test_curtir_exige_login(self, client, ana_headers):
        post = _criar_post(client, ana_headers)
        assert client.post(f"/forum/posts/{post['id']}/like").status_code == 401

    def test_curtir_post_inexistente_404(self, client, ana_headers):
        assert client.post("/forum/posts/9999/like", headers=ana_headers).status_code == 404

    def test_eu_curti_so_para_quem_curtiu(self, client, ana_headers, bruno_headers):
        post = _criar_post(client, ana_headers)
        client.post(f"/forum/posts/{post['id']}/like", headers=ana_headers)

        meu = client.get(f"/forum/posts/{post['id']}", headers=ana_headers).json()
        assert meu["likes_count"] == 1 and meu["eu_curti"] is True

        de_bruno = client.get(f"/forum/posts/{post['id']}", headers=bruno_headers).json()
        assert de_bruno["likes_count"] == 1 and de_bruno["eu_curti"] is False

        anonimo = client.get(f"/forum/posts/{post['id']}").json()
        assert anonimo["likes_count"] == 1 and anonimo["eu_curti"] is False

    def test_feed_traz_contagem_e_eu_curti(self, client, ana_headers, bruno_headers):
        post = _criar_post(client, ana_headers)
        client.post(f"/forum/posts/{post['id']}/like", headers=ana_headers)
        client.post(f"/forum/posts/{post['id']}/like", headers=bruno_headers)

        feed = client.get("/forum/posts", headers=ana_headers).json()["items"][0]
        assert feed["likes_count"] == 2 and feed["eu_curti"] is True

        anonimo = client.get("/forum/posts").json()["items"][0]
        assert anonimo["likes_count"] == 2 and anonimo["eu_curti"] is False

    def test_apagar_post_remove_curtidas_em_cascata(self, client, db, ana_headers, bruno_headers):
        from app.database.models import Curtida
        post = _criar_post(client, ana_headers)
        client.post(f"/forum/posts/{post['id']}/like", headers=bruno_headers)
        assert client.delete(f"/forum/posts/{post['id']}", headers=ana_headers).status_code == 204
        assert db.query(Curtida).count() == 0


class TestDenuncia:
    def test_denunciar_post_com_e_sem_motivo(self, client, ana_headers, bruno_headers):
        post = _criar_post(client, ana_headers)
        assert client.post(f"/forum/posts/{post['id']}/denuncia", headers=bruno_headers, json={"motivo": "ofensivo"}).status_code == 201
        assert client.post(f"/forum/posts/{post['id']}/denuncia", headers=bruno_headers, json={}).status_code == 201

    def test_denunciar_exige_login(self, client, ana_headers):
        post = _criar_post(client, ana_headers)
        assert client.post(f"/forum/posts/{post['id']}/denuncia", json={}).status_code == 401

    def test_denunciar_resposta(self, client, ana_headers, bruno_headers):
        post = _criar_post(client, ana_headers)
        resp = client.post(
            f"/forum/posts/{post['id']}/respostas", headers=ana_headers, json={"conteudo": "r"}
        ).json()
        assert client.post(f"/forum/respostas/{resp['id']}/denuncia", headers=bruno_headers, json={}).status_code == 201


class TestImagens:
    def test_presign_confirm_aparece_no_feed_e_detalhe(self, client, ana_headers, fake_r2):
        post = _criar_post(client, ana_headers)
        pre, conf = _add_imagem(client, ana_headers, post["id"], fake_r2, "image/webp")

        assert pre.json()["key"].startswith(f"posts/{post['id']}/")
        assert conf.status_code == 201, conf.json()
        img = conf.json()
        assert img["content_type"] == "image/webp"
        assert pre.json()["key"] in img["image_url"]

        feed = client.get("/forum/posts").json()["items"][0]
        assert len(feed["imagens"]) == 1
        detalhe = client.get(f"/forum/posts/{post['id']}").json()
        assert detalhe["imagens"][0]["id"] == img["id"]

    def test_presign_exige_login(self, client, ana_headers, fake_r2):
        post = _criar_post(client, ana_headers)
        r = client.post(f"/forum/posts/{post['id']}/images/presign", json={"content_type": "image/jpeg"})
        assert r.status_code == 401

    def test_presign_apenas_autor(self, client, ana_headers, bruno_headers, fake_r2):
        post = _criar_post(client, ana_headers)
        r = client.post(
            f"/forum/posts/{post['id']}/images/presign", headers=bruno_headers, json={"content_type": "image/jpeg"}
        )
        assert r.status_code == 403

    def test_content_type_invalido_422(self, client, ana_headers, fake_r2):
        post = _criar_post(client, ana_headers)
        r = client.post(
            f"/forum/posts/{post['id']}/images/presign", headers=ana_headers, json={"content_type": "image/gif"}
        )
        assert r.status_code == 422

    def test_limite_de_fotos_por_post(self, client, ana_headers, fake_r2):
        post = _criar_post(client, ana_headers)
        for _ in range(settings.R2_MAX_IMAGENS_POR_POST):
            _, conf = _add_imagem(client, ana_headers, post["id"], fake_r2)
            assert conf.status_code == 201
        r = client.post(
            f"/forum/posts/{post['id']}/images/presign", headers=ana_headers, json={"content_type": "image/jpeg"}
        )
        assert r.status_code == 409

    def test_confirm_chave_de_outro_post_400(self, client, ana_headers, fake_r2):
        post = _criar_post(client, ana_headers)
        r = client.post(
            f"/forum/posts/{post['id']}/images/confirm", headers=ana_headers, json={"key": "posts/9999/x.jpg"}
        )
        assert r.status_code == 400

    def test_confirm_sem_upload_400(self, client, ana_headers, fake_r2):
        post = _criar_post(client, ana_headers)
        pre = client.post(
            f"/forum/posts/{post['id']}/images/presign", headers=ana_headers, json={"content_type": "image/jpeg"}
        )
        r = client.post(
            f"/forum/posts/{post['id']}/images/confirm", headers=ana_headers, json={"key": pre.json()["key"]}
        )
        assert r.status_code == 400

    def test_confirm_grande_demais_413_e_apaga(self, client, ana_headers, fake_r2):
        post = _criar_post(client, ana_headers)
        pre = client.post(
            f"/forum/posts/{post['id']}/images/presign", headers=ana_headers, json={"content_type": "image/jpeg"}
        )
        key = pre.json()["key"]
        fake_r2.upload(key, "image/jpeg", settings.R2_MAX_BYTES + 1)
        r = client.post(f"/forum/posts/{post['id']}/images/confirm", headers=ana_headers, json={"key": key})
        assert r.status_code == 413
        assert key not in fake_r2.objetos

    def test_apagar_imagem_pelo_autor(self, client, ana_headers, fake_r2):
        post = _criar_post(client, ana_headers)
        pre, conf = _add_imagem(client, ana_headers, post["id"], fake_r2)
        key = pre.json()["key"]
        assert key in fake_r2.objetos
        assert client.delete(f"/forum/images/{conf.json()['id']}", headers=ana_headers).status_code == 204
        assert key not in fake_r2.objetos
        assert client.get(f"/forum/posts/{post['id']}").json()["imagens"] == []

    def test_apagar_imagem_outro_membro_403_moderador_ok(self, client, ana_headers, bruno_headers, carla_headers, fake_r2):
        post = _criar_post(client, ana_headers)
        _, conf = _add_imagem(client, ana_headers, post["id"], fake_r2)
        img_id = conf.json()["id"]
        assert client.delete(f"/forum/images/{img_id}", headers=bruno_headers).status_code == 403
        assert client.delete(f"/forum/images/{img_id}", headers=carla_headers).status_code == 204

    def test_apagar_post_remove_imagens_em_cascata(self, client, db, ana_headers, fake_r2):
        post = _criar_post(client, ana_headers)
        _add_imagem(client, ana_headers, post["id"], fake_r2)
        assert client.delete(f"/forum/posts/{post['id']}", headers=ana_headers).status_code == 204
        assert db.query(PostImagem).count() == 0
