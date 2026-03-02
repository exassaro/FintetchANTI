"""MLflow Model Loader for the Classification Service.

Manages loading and caching of ML models from the MLflow registry.
Each schema has its own tracking URI and registered model name.
"""

import logging

import mlflow
import mlflow.sklearn
from mlflow.tracking import MlflowClient

from app.core.config import SCHEMA_MLFLOW_URIS, SCHEMA_MODEL_NAMES

logger = logging.getLogger(__name__)



_model_cache = {}


def get_model(schema: str):
    """Load and cache the Production ML model for a given schema.

    Args:
        schema: Schema identifier ('A', 'B', 'C', 'D', 'H', or 'E').

    Returns:
        The fitted sklearn pipeline, or None for schema 'H'.

    Raises:
        ValueError: If schema is unsupported or not configured.
        RuntimeError: If the model fails to load from MLflow.
    """

    if schema == "H":
        return None

    if schema == "E":
        raise ValueError("Amount-only schema not supported")

    if schema not in SCHEMA_MLFLOW_URIS:
        raise ValueError(f"No MLflow configuration for schema '{schema}'")

    if schema in _model_cache:
        return _model_cache[schema]

    tracking_uri = SCHEMA_MLFLOW_URIS[schema]
    model_name = SCHEMA_MODEL_NAMES[schema]

    # Switch MLflow registry context
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_registry_uri(tracking_uri)

    try:
        model = mlflow.sklearn.load_model(
            f"models:/{model_name}/Production"
        )
    except Exception as exc:
        logger.error(
            "Failed to load model for schema '%s': %s",
            schema,
            exc,
            exc_info=True,
        )
        raise RuntimeError(
            f"Failed to load model for schema '{schema}': {exc}"
        ) from exc

    _model_cache[schema] = model
    logger.info("Loaded and cached model for schema '%s'", schema)

    return model


def get_model_metadata(schema: str) -> dict:
    """Retrieve model name and version for a given schema.

    Args:
        schema: Schema identifier.

    Returns:
        dict: Keys ``model_name`` and ``model_version``.

    Raises:
        ValueError: If schema is not configured or no Production model exists.
    """

    if schema == "H":
        return {
            "model_name": "HSN_RULE_ENGINE",
            "model_version": "N/A"
        }

    if schema not in SCHEMA_MLFLOW_URIS:
        raise ValueError(f"No MLflow configuration for schema '{schema}'")

    tracking_uri = SCHEMA_MLFLOW_URIS[schema]
    model_name = SCHEMA_MODEL_NAMES[schema]

    # Switch registry before fetching metadata
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_registry_uri(tracking_uri)

    client = MlflowClient()

    versions = client.get_latest_versions(
        model_name,
        stages=["Production"]
    )

    if not versions:
        raise ValueError(
            f"No Production model found for '{model_name}'"
        )

    latest = versions[0]

    return {
        "model_name": model_name,
        "model_version": latest.version,
    }