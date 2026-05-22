import os
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from geoalchemy2 import alembic_helpers

from alembic import context

load_dotenv()

config = context.config

# Lê a DATABASE_URL do .env em vez de hardcodar no alembic.ini
config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Importa Base e todos os models para popular o metadata
from app.database.session import Base
import app.database.models  # noqa: F401

target_metadata = Base.metadata


def include_object(object, name, type_, reflected, compare_to):
    """Filtra o que o autogenerate analisa.

    Sem isso o Alembic vê tabelas do PostGIS (spatial_ref_sys) e do TIGER
    (featnames, county, edges...) e gera DROP TABLE para todas elas.
    Aqui limitamos a análise apenas às tabelas declaradas nos nossos models.
    """
    if not alembic_helpers.include_object(object, name, type_, reflected, compare_to):
        return False
    if type_ == "table":
        return name in target_metadata.tables
    if type_ == "index":
        return object.table.name in target_metadata.tables
    return True


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_item=alembic_helpers.render_item,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_item=alembic_helpers.render_item,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
