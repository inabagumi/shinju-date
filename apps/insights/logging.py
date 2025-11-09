import logging
import sys

from uvicorn.logging import DefaultFormatter


def setup_logging():
    formatter = DefaultFormatter(
        "%(levelprefix)s %(asctime)s [%(name)s] %(message)s",
        use_colors=None,
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    logging.basicConfig(level=logging.INFO, handlers=[handler])
