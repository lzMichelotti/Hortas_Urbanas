# Imagem da API — base na doc oficial: https://fastapi.tiangolo.com/deployment/docker/
FROM python:3.12-slim

# Não escreve .pyc e não bufferiza a saída (logs aparecem na hora em `docker logs`).
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /code

# Copia só o requirements primeiro: enquanto ele não muda, o Docker reaproveita
# a camada de `pip install` do cache — rebuilds de código não reinstalam deps.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Código da aplicação + o necessário para rodar migrations e seed dentro do container.
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .
COPY scripts/ ./scripts/

EXPOSE 8000

# Produção: SEM --reload. --proxy-headers + --forwarded-allow-ips porque a API roda
# atrás do Caddy (outro container), que envia os cabeçalhos X-Forwarded-* .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
