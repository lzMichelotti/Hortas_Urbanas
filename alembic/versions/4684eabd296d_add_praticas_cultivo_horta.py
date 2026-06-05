"""add_praticas_cultivo_horta

Revision ID: 4684eabd296d
Revises: 801c7ecc4544
Create Date: 2026-05-25 15:49:55.916639

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4684eabd296d'
down_revision: Union[str, Sequence[str], None] = '801c7ecc4544'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('Hortas', sa.Column('praticas_cultivo', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('Hortas', 'praticas_cultivo')
