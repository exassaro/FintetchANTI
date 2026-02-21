import mlflow
import mlflow.sklearn
from mlflow.tracking import MlflowClient

from app.core.config import SCHEMA_MLFLOW_URIS, SCHEMA_MODEL_NAMES


_model_cache = {}


def get_model(schema: str):

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

    model = mlflow.sklearn.load_model(
        f"models:/{model_name}/Production"
    )

    _model_cache[schema] = model

    return model


def get_model_metadata(schema: str):

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