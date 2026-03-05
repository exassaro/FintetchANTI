"""
MLflow Manager for Retraining Service.

Uses the EXACT SAME tracking URIs, registry URIs, and model names
as the classification_service, so that promoted models are immediately
available for inference.

Classification service loads models via:
    mlflow.set_tracking_uri(SCHEMA_MLFLOW_URIS[schema])
    mlflow.set_registry_uri(SCHEMA_MLFLOW_URIS[schema])
    # Resolves artifact path from run_id to avoid Windows-path issues
"""

import logging
from pathlib import Path

import mlflow
import mlflow.sklearn
from mlflow.tracking import MlflowClient

from app.config import MLFLOW_BASE_PATH, SCHEMA_MLFLOW_URIS, SCHEMA_MODEL_NAMES

logger = logging.getLogger(__name__)

# Minimum F1 improvement required for promotion (prevents noise promotions)
PROMOTION_THRESHOLD = 0.01

# Maps schema letter to its sub-directory under MLFLOW_BASE_PATH
_SCHEMA_SUBDIRS = {
    "A": "desc_cat_vend",
    "B": "desc_cat",
    "C": "desc_vend",
    "D": "desc",
}


def _get_tracking_uri(schema_type: str) -> str:
    uri = SCHEMA_MLFLOW_URIS.get(schema_type)
    if not uri:
        raise ValueError(f"No MLflow config for schema '{schema_type}'")
    return uri


def _get_model_name(schema_type: str) -> str:
    name = SCHEMA_MODEL_NAMES.get(schema_type)
    if not name:
        raise ValueError(f"No model name for schema '{schema_type}'")
    return name


def _resolve_artifact_path(schema_type: str, run_id: str) -> str:
    """Build the local artifact path for a model from its run_id.

    Avoids hardcoded Windows paths stored in MLflow registry metadata.
    """
    subdir = _SCHEMA_SUBDIRS[schema_type]
    mlruns_root = Path(MLFLOW_BASE_PATH) / subdir / "mlruns"

    for entry in mlruns_root.iterdir():
        if not entry.is_dir() or entry.name in {"models", ".trash", "0"}:
            continue
        candidate = entry / run_id / "artifacts" / "model"
        if candidate.exists():
            return str(candidate)

    for entry in mlruns_root.iterdir():
        if not entry.is_dir():
            continue
        candidate = entry / run_id / "artifacts" / "model"
        if candidate.exists():
            return str(candidate)

    raise FileNotFoundError(
        f"Could not find model artifacts for run '{run_id}' under {mlruns_root}"
    )


def fetch_production_model(schema_type: str):
    """
    Fetch the Production model for the given schema type from MLflow.
    Returns the loaded scikit-learn model, or None if no Production model exists.
    """
    tracking_uri = _get_tracking_uri(schema_type)
    model_name = _get_model_name(schema_type)

    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_registry_uri(tracking_uri)

    client = MlflowClient(tracking_uri=tracking_uri, registry_uri=tracking_uri)

    try:
        prod_versions = client.get_latest_versions(model_name, stages=["Production"])
        if not prod_versions:
            logger.info(f"No Production model found for {model_name}.")
            return None

        run_id = prod_versions[0].run_id
        artifact_path = _resolve_artifact_path(schema_type, run_id)
        logger.info(f"Loading Production model from {artifact_path}")
        model = mlflow.sklearn.load_model(artifact_path)
        return model
    except Exception as e:
        logger.warning(f"Could not fetch Production model for {schema_type}: {e}")
        return None


def log_and_maybe_promote(schema_type: str, model, metrics: dict):
    """
    Log the trained model to MLflow, register it, and promote to
    Production if it outperforms the current Production model.

    Returns:
        (old_version, new_version, promoted)
    """

    tracking_uri = _get_tracking_uri(schema_type)
    model_name = _get_model_name(schema_type)

    # Set BOTH tracking and registry URIs (classification_service does this)
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_registry_uri(tracking_uri)

    experiment_name = f"{schema_type}_classification"
    mlflow.set_experiment(experiment_name)

    client = MlflowClient(tracking_uri=tracking_uri, registry_uri=tracking_uri)

    # ----------------------------------------------------------
    # 1) Log the run
    # ----------------------------------------------------------
    with mlflow.start_run() as run:
        mlflow.log_metrics({
            "macro_f1": metrics["macro_f1"],
            "accuracy": metrics.get("accuracy", 0),
        })
        mlflow.log_param("schema_type", schema_type)
        mlflow.sklearn.log_model(model, "model")
        run_id = run.info.run_id

    logger.info(f"Logged MLflow run {run_id} for schema {schema_type}")

    # ----------------------------------------------------------
    # 2) Register the model version
    # ----------------------------------------------------------
    try:
        client.create_registered_model(model_name)
        logger.info("Created new registered model: %s", model_name)
    except Exception:
        logger.debug(
            "Registered model '%s' already exists (expected)", model_name
        )

    mv = client.create_model_version(
        name=model_name,
        source=f"runs:/{run_id}/model",
        run_id=run_id,
    )
    logger.info(f"Registered model version {mv.version} for {model_name}")

    # ----------------------------------------------------------
    # 3) Check current Production model's F1
    # ----------------------------------------------------------
    old_f1 = 0.0
    old_version = None

    try:
        prod_versions = client.get_latest_versions(
            model_name, stages=["Production"]
        )
        if prod_versions:
            old_version = prod_versions[0].version
            old_run = client.get_run(prod_versions[0].run_id)
            old_f1 = old_run.data.metrics.get("macro_f1", 0.0)
            logger.info(
                f"Current Production model v{old_version} has macro_f1={old_f1:.4f}"
            )
    except Exception as e:
        logger.warning(f"Could not fetch Production model metrics: {e}")

    # ----------------------------------------------------------
    # 4) Promote if performance improves
    # ----------------------------------------------------------
    new_f1 = metrics["macro_f1"]
    promoted = False

    if new_f1 > old_f1 + PROMOTION_THRESHOLD:
        client.transition_model_version_stage(
            name=model_name,
            version=mv.version,
            stage="Production",
            archive_existing_versions=True,
        )
        promoted = True
        logger.info(
            f"PROMOTED {model_name} v{mv.version} to Production "
            f"(F1: {old_f1:.4f} → {new_f1:.4f})"
        )
    else:
        logger.info(
            f"NOT promoted: new F1 ({new_f1:.4f}) does not beat "
            f"current ({old_f1:.4f}) by {PROMOTION_THRESHOLD}"
        )

    return old_version, mv.version, promoted