from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=10,
    max_overflow=20,
    # -c statement_timeout=10000 → Postgres aborta qualquer statement que passe
    # de 10s; libera a conexão de volta ao pool em vez de retê-la indefinidamente.
    connect_args={"options": "-c statement_timeout=10000"},
)
# expire_on_commit=False: após commit(), o objeto retém os valores em memória
# em vez de marcar atributos como expirados. Evita um SELECT implícito por write
# quando o handler serializa o objeto retornado. Seguro porque cada request usa
# uma session própria via get_db() — não há compartilhamento entre threads.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
