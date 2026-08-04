"""encaminhamento de demanda ao admin

Revision ID: b3c7f0a91d24
Revises: d5e1a9c37b64
Create Date: 2026-08-03 17:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3c7f0a91d24'
down_revision: Union[str, Sequence[str], None] = 'd5e1a9c37b64'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('Demandas', sa.Column('encaminhada_em', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('Demandas', 'encaminhada_em')
