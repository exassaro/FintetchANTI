"""
Model Evaluator for Retraining Service.

Computes Macro F1 (primary promotion metric) and a full
classification report.

Note: all values are converted to native Python types so
they can be stored in the PostgreSQL JSONB column without
numpy serialization errors.
"""

import logging

from sklearn.metrics import classification_report, f1_score

logger = logging.getLogger(__name__)


def _to_native(obj):
    """Recursively convert numpy types to native Python types."""
    if isinstance(obj, dict):
        return {k: _to_native(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_native(i) for i in obj]
    # numpy int / float → Python int / float
    if hasattr(obj, "item"):
        return obj.item()
    return obj


def evaluate_model(model, X_test, y_test) -> dict:
    """
    Returns:
        {
            "macro_f1": float,
            "accuracy": float,
            "classification_report": { ... }
        }
    """
    y_pred = model.predict(X_test)

    macro_f1 = float(f1_score(y_test, y_pred, average="macro"))
    accuracy = float((y_pred == y_test).mean())
    report = classification_report(y_test, y_pred, output_dict=True)

    metrics = {
        "macro_f1": macro_f1,
        "accuracy": accuracy,
        "classification_report": _to_native(report),
    }

    logger.info(f"Evaluation — macro_f1: {macro_f1:.4f}, accuracy: {accuracy:.4f}")

    return metrics