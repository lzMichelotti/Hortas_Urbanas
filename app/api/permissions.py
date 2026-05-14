from fastapi import HTTPException
from app.database.models import Canteiro, Usuario

## ARQUIVO DESTINADO A EVITAR AS DIVERSAS VERIFICACOES DE PRIVILEGIO NO CODIGO

# --- Horta ---

def exigir_acesso_horta(usuario: Usuario, horta_id: int):
    """ADMIN_SUPREMO é isento. Qualquer outro nível fica restrito à sua própria horta."""
    if usuario.privilegio != "ADMIN_SUPREMO" and usuario.horta_id != horta_id:
        raise HTTPException(status_code=403, detail="Sem permissão para acessar recursos desta horta.")


def exigir_lider_da_horta(lider: Usuario, horta_id: int):
    """Para rotas que já exigem LIDER+. LIDER_HORTA fica restrito à sua horta; ADMIN_SUPREMO é isento.
    Equivalente a verificar_horta em dependencies.py — use este e remova aquele."""
    if lider.privilegio == "LIDER_HORTA" and lider.horta_id != horta_id:
        raise HTTPException(status_code=403, detail="Sem permissão para esta horta.")


def horta_id_visivel(usuario: Usuario) -> int | None:
    """Retorna o horta_id para filtrar listagens.
    LIDER_HORTA enxerga só a sua horta; ADMIN_SUPREMO enxerga todas (retorna None)."""
    if usuario.privilegio == "LIDER_HORTA":
        return usuario.horta_id
    return None


# --- Canteiro ---

def exigir_dono_do_canteiro(usuario: Usuario, canteiro: Canteiro):
    """MEMBRO_CANTEIRO só opera no seu próprio canteiro."""
    if usuario.privilegio == "MEMBRO_CANTEIRO" and canteiro.usuario_id != usuario.id:
        raise HTTPException(status_code=403, detail="Você só pode acessar o seu próprio canteiro.")


# --- Usuário ---

def exigir_lider_pode_criar_usuario(lider: Usuario, privilegio_novo: str):
    """LIDER_HORTA não pode criar usuários com privilégio igual ou superior ao seu."""
    if lider.privilegio == "LIDER_HORTA" and privilegio_novo in ["ADMIN_SUPREMO", "LIDER_HORTA"]:
        raise HTTPException(status_code=403, detail="Líderes só podem criar membros de canteiro.")
