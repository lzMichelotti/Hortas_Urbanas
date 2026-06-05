import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# Logger raiz da aplicação — todos os módulos criam filhos dele via getLogger(__name__)
logger = logging.getLogger("app")
