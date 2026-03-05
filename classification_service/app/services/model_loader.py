"""MLflow Model Loader for the Classification Service.

Manages loading and caching of ML models from the MLflow registry.
Each schema has its own tracking URI and registered model name.

When running inside Docker, the model metadata files may contain
absolute Windows paths recorded during training.  To work around
this, we resolve the artifact path ourselves from the run_id and
load the model directly from the file system.
"""

import logging
import os
from pathlib import Path

import mlflow
import mlflow.sklearn
from mlflow.tracking import MlflowClient

from app.core.config import (
    MLFLOW_BASE_PATH,
    SCHEMA_MLFLOW_URIS,
    SCHEMA_MODEL_NAMES,
)

logger = logging.getLogger(__name__)

# Maps schema letter to its sub-directory under MLFLOW_BASE_PATH
_SCHEMA_SUBDIRS = {
    "A": "desc_cat_vend",
    "B": "desc_cat",
    "C": "desc_vend",
    "D": "desc",
}

_model_cache = {}


def _resolve_artifact_path(schema: str, run_id: str) -> str:
    """Build the local artifact path for a model from its run_id.

    Instead of relying on the ``source`` URI stored in the MLflow
    registry metadata (which may contain Windows paths), we construct
    the path relative to MLFLOW_BASE_PATH so it works on any OS.

    Returns:
        Absolute filesystem path to the ``model`` artifact directory.
    """
    subdir = _SCHEMA_SUBDIRS[schema]
    mlruns_root = Path(MLFLOW_BASE_PATH) / subdir / "mlruns"

    # Find the experiment directory (first numeric dir that contains the run)
    for entry in mlruns_root.iterdir():
        if not entry.is_dir() or entry.name in {"models", ".trash", "0"}:
            continue
        candidate = entry / run_id / "artifacts" / "model"
        if candidate.exists():
            return str(candidate)

    # Fallback: search all experiment directories
    for entry in mlruns_root.iterdir():
        if not entry.is_dir():
            continue
        candidate = entry / run_id / "artifacts" / "model"
        if candidate.exists():
            return str(candidate)

    raise FileNotFoundError(
        f"Could not find model artifacts for run '{run_id}' "
        f"under {mlruns_root}"
    )


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
        # Look up the Production model version to get its run_id
        client = MlflowClient()
        versions = client.get_latest_versions(
            model_name, stages=["Production"]
        )
        if not versions:
            raise ValueError(
                f"No Production model found for '{model_name}'"
            )

        run_id = versions[0].run_id
        logger.info(
            "Located Production model '%s' v%s  (run %s)",
            model_name,
            versions[0].version,
            run_id,
        )

        # Resolve the actual artifact path on the current filesystem
        # (avoids hardcoded Windows paths in MLflow metadata)
        artifact_path = _resolve_artifact_path(schema, run_id)
        logger.info("Loading model from: %s", artifact_path)

        model = mlflow.sklearn.load_model(artifact_path)

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