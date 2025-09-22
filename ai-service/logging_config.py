"""
Logging configuration for AI Service
"""

import os
import logging
import logging.handlers
from datetime import datetime
from pathlib import Path
from typing import Optional


class ColoredFormatter(logging.Formatter):
    """Colored log formatter for console output"""

    COLORS = {
        "DEBUG": "\033[36m",  # Cyan
        "INFO": "\033[32m",  # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",  # Red
        "CRITICAL": "\033[35m",  # Magenta
    }
    RESET = "\033[0m"

    def format(self, record):
        log_message = super().format(record)
        return f"{self.COLORS.get(record.levelname, '')}{log_message}{self.RESET}"


def setup_logger(
    name: str = "ai_service",
    level: str = "INFO",
    log_file: Optional[str] = None,
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5,
) -> logging.Logger:
    """
    Setup logger with both file and console handlers

    Args:
        name: Logger name
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Log file path (if None, uses default)
        max_bytes: Maximum log file size before rotation
        backup_count: Number of backup files to keep

    Returns:
        Configured logger instance
    """

    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))

    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    # Create formatters
    file_formatter = logging.Formatter(
        "%(asctime)s | %(name)s | %(levelname)-8s | %(filename)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_formatter = ColoredFormatter(
        "%(asctime)s | %(levelname)-8s | %(message)s", datefmt="%H:%M:%S"
    )

    # Setup file handler with rotation
    if log_file is None:
        # Create date-based directory structure: logs/YYYYMMDD/
        base_logs_dir = Path(os.getenv("STORAGE_LOGS_DIR", "../logs"))
        today_str = datetime.now().strftime("%Y%m%d")
        daily_logs_dir = base_logs_dir / today_str
        daily_logs_dir.mkdir(parents=True, exist_ok=True)

        log_file = daily_logs_dir / f"{name}.log"

    file_handler = logging.handlers.RotatingFileHandler(
        log_file, maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8"
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(file_formatter)

    # Setup console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, level.upper()))
    console_handler.setFormatter(console_formatter)

    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger


def get_logger(name: str = "ai_service") -> logging.Logger:
    """Get existing logger or create new one"""
    return logging.getLogger(name)


# Create application-wide logger
app_logger = setup_logger(name="ai_service", level=os.getenv("LOG_LEVEL", "INFO"))

# Create specialized loggers
rag_logger = setup_logger(name="ai_service.rag", level=os.getenv("LOG_LEVEL", "INFO"))

api_logger = setup_logger(name="ai_service.api", level=os.getenv("LOG_LEVEL", "INFO"))
