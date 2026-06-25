"""
logging_config.py — Centralised logging setup.

Call setup_logging() once at startup (in main.py) before any other imports
that create loggers.  All app loggers use the name prefix 'app.*', so they
are controlled by the 'app' logger entry here.

Log format:
    2025-06-25 14:03:21 [INFO    ] app.services.pdf_service: File uploaded: ...

Logs are written to both stdout and a rotating file under LOG_DIR:
    data/logs/app.log        — current log
    data/logs/app.log.1 …   — rotated backups (up to 5 × 10 MB)

Level is driven by the LOG_LEVEL env var (default INFO).
In development you can set LOG_LEVEL=DEBUG in backend/.env to get verbose output.
"""

import logging
import logging.config
from pathlib import Path


def setup_logging(log_level: str = "INFO", log_dir: str = "./data/logs") -> None:
    """Configure logging for the entire application.

    Args:
        log_level: Root log level string (e.g. "DEBUG", "INFO", "WARNING").
                   Typically sourced from settings.log_level.
        log_dir:   Directory where log files are written.
                   Created automatically if it does not exist.
    """
    level = log_level.upper()

    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)
    log_file = str(log_path / "app.log")

    config: dict = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "standard": {
                "format": "%(asctime)s [%(levelname)-8s] %(name)s: %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "standard",
                "stream": "ext://sys.stdout",
            },
            # Rotating file: max 10 MB per file, keep 5 backups (~50 MB total).
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "formatter": "standard",
                "filename": log_file,
                "maxBytes": 10 * 1024 * 1024,  # 10 MB
                "backupCount": 5,
                "encoding": "utf-8",
            },
        },
        # Fine-grained logger control.
        # 'propagate: False' prevents duplicate lines when the root logger
        # also has handlers.
        "loggers": {
            # All app.* loggers inherit this level.
            "app": {
                "handlers": ["console", "file"],
                "level": level,
                "propagate": False,
            },
            # Route uvicorn through the same formatter so every log line
            # shares the same timestamp / level style.
            "uvicorn": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn.error": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
            # uvicorn.access logs every request — silenced here because the
            # RequestLoggingMiddleware in main.py handles request logging,
            # avoiding duplicate lines.
            "uvicorn.access": {
                "handlers": ["console", "file"],
                "level": "WARNING",
                "propagate": False,
            },
        },
        "root": {
            "handlers": ["console", "file"],
            "level": level,
        },
    }

    logging.config.dictConfig(config)
