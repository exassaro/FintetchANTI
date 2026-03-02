"""
Structured logging configuration for the Anomaly Detection Service.

Sets up JSON-formatted structured logging with timestamp, level, module,
and message fields for production-grade observability.
"""

import logging
import json
from datetime import datetime, timezone


class StructuredFormatter(logging.Formatter):
    """JSON-based structured log formatter for production logging."""

    def format(self, record: logging.LogRecord) -> str:
        """Format a log record as a JSON string.

        Args:
            record: The log record to format.

        Returns:
            A JSON-encoded string with structured log fields.
        """
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)


def setup_logging(level: int = logging.INFO) -> None:
    """Configure root logger with structured JSON output.

    Args:
        level: The minimum logging level. Defaults to ``logging.INFO``.
    """
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredFormatter())

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Avoid duplicate handlers on repeated calls
    if not root_logger.handlers:
        root_logger.addHandler(handler)