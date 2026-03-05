"""
Trainer for Retraining Service.

Builds a sklearn pipeline that matches the classification_service's
feature contract EXACTLY:

    TEXT_FEATURE    = "text_input_clean"
    NUMERIC_FEATURES = ["amount", "log_amount", "amount_zscore", "amount_percentile"]

The inference pipeline in classification_service calls:
    X_new = df[["text_input_clean", "amount", "log_amount", "amount_zscore", "amount_percentile"]]
    model.predict_proba(X_new)

So the retrained model must accept the same DataFrame shape.
"""

import logging

import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.config import TEXT_FEATURE, NUMERIC_FEATURES, LABEL_COLUMN
from app.services.mlflow_manager import fetch_production_model

logger = logging.getLogger(__name__)


def train_model(
    dataset: pd.DataFrame,
    schema_type: str,
):
    """
    Train a classification model matching the feature contract.

    Returns:
        (pipeline, X_test, y_test)
    """

    # Validate required columns exist
    required = [TEXT_FEATURE] + NUMERIC_FEATURES + [LABEL_COLUMN]
    missing = [c for c in required if c not in dataset.columns]
    if missing:
        # Fall back: if final_gst_slab exists, use that as label
        if "final_gst_slab" in dataset.columns and LABEL_COLUMN in missing:
            missing.remove(LABEL_COLUMN)
            label_col = "final_gst_slab"
        else:
            raise ValueError(
                f"Dataset missing required columns for schema {schema_type}: {missing}"
            )
    else:
        label_col = LABEL_COLUMN

    # Use final_gst_slab if available (human-corrected labels)
    if "final_gst_slab" in dataset.columns:
        label_col = "final_gst_slab"

    # Drop rows with missing labels or text
    clean = dataset.dropna(subset=[label_col, TEXT_FEATURE])
    clean = clean[clean[TEXT_FEATURE].str.strip() != ""]

    if len(clean) < 10:
        raise ValueError(
            f"Insufficient data for training schema {schema_type}: "
            f"only {len(clean)} valid rows"
        )

    X = clean[[TEXT_FEATURE] + NUMERIC_FEATURES]
    y = clean[label_col].astype(int)

    logger.info(
        f"Training schema {schema_type}: {len(X)} samples, "
        f"{y.nunique()} classes, label col = {label_col}"
    )

    # Stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        stratify=y,
        test_size=0.2,
        random_state=42,
    )

    # Attempt to fetch the production model to reuse its architecture
    prod_model = fetch_production_model(schema_type)
    if prod_model is not None:
        logger.info(f"Dynamically rebuilding pipeline based on Production model for {schema_type}")
        # clone creates an unfitted model with the exact same parameters
        pipeline = clone(prod_model)
    else:
        logger.info(f"No Production model found. Falling back to default LogisticRegression pipeline for {schema_type}")
        # Build pipeline matching the inference feature contract
        preprocessor = ColumnTransformer(
            transformers=[
                ("text", TfidfVectorizer(max_features=5000), TEXT_FEATURE),
                ("numeric", StandardScaler(), NUMERIC_FEATURES),
            ],
            remainder="drop",
            n_jobs=-1
        )

        pipeline = Pipeline([
            ("features", preprocessor),
            ("clf", LogisticRegression(max_iter=250, solver="lbfgs", n_jobs=-1)),
        ])

    pipeline.fit(X_train, y_train)

    train_score = pipeline.score(X_train, y_train)
    test_score = pipeline.score(X_test, y_test)
    logger.info(
        f"Schema {schema_type} baseline accuracy — "
        f"train: {train_score:.4f}, test: {test_score:.4f}"
    )

    return pipeline, X_test, y_test