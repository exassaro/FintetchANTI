import numpy as np
import pandas as pd

from app.services.model_loader import get_model
from app.services.hsn_classifier import classify_hsn
from app.core.config import TEXT_FEATURE, NUMERIC_FEATURES


class ModelInferenceError(Exception):
    pass


def _prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Prepare feature dataframe exactly as used during training.
    """

    required = [TEXT_FEATURE] + NUMERIC_FEATURES

    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ModelInferenceError(
            f"Missing required feature columns: {missing}"
        )

    return df[required]


def classify(df: pd.DataFrame, schema: str) -> pd.DataFrame:
    """
    Unified classification entry point.

    Handles:
    - ML schemas (A–D)
    - HSN rule schema (H)

    Returns enriched DataFrame.
    """

    # -----------------------------
    # HSN rule-based schema
    # -----------------------------
    if schema == "H":
        return classify_hsn(df)

    if schema == "E":
        raise ModelInferenceError(
            "Amount-only schema (E) not supported"
        )

    model = get_model(schema)

    if model is None:
        raise ModelInferenceError(
            f"No model found for schema '{schema}'"
        )

    df_out = df.copy()

    # Prepare feature subset (must match training)
    X_new = _prepare_features(df_out)

    try:
        probs = model.predict_proba(X_new)
    except Exception as exc:
        raise ModelInferenceError(
            f"Model inference failed: {exc}"
        )

    # Correct class mapping using sklearn classes_
    classes = model.classes_
    pred_indices = np.argmax(probs, axis=1)
    preds = classes[pred_indices]

    df_out["gst_slab_predicted"] = preds
    df_out["gst_confidence"] = probs.max(axis=1)

    # Confidence margin (top1 - top2)
    if probs.shape[1] > 1:
        sorted_probs = np.sort(probs, axis=1)
        df_out["gst_confidence_margin"] = (
            sorted_probs[:, -1] - sorted_probs[:, -2]
        )
    else:
        df_out["gst_confidence_margin"] = 1.0

    df_out["classification_source"] = "ML_MODEL"

    return df_out