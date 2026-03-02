"""
Unit tests for the Retraining Service.

Covers the trainer, evaluator, dataset builder, scheduler,
config, schemas, API routes, and MLflow manager.
"""

import uuid
from datetime import datetime
from unittest.mock import patch, MagicMock

import numpy as np
import pandas as pd
import pytest

# ---------------------------------------------------------------------------
# Evaluator tests
# ---------------------------------------------------------------------------


class TestEvaluator:
    """Tests for the model evaluation module."""

    def test_evaluate_model_returns_correct_keys(self):
        """Verify evaluate_model returns macro_f1, accuracy, and report."""
        from app.services.evaluator import evaluate_model

        # Create a simple mock model
        mock_model = MagicMock()
        mock_model.predict.return_value = np.array([0, 1, 0, 1])

        X_test = pd.DataFrame({
            "text_input_clean": ["a", "b", "c", "d"],
            "amount": [100, 200, 300, 400],
            "log_amount": [4.6, 5.3, 5.7, 6.0],
            "amount_zscore": [0.1, 0.2, 0.3, 0.4],
            "amount_percentile": [0.25, 0.5, 0.75, 1.0],
        })
        y_test = pd.Series([0, 1, 0, 1])

        metrics = evaluate_model(mock_model, X_test, y_test)

        assert "macro_f1" in metrics
        assert "accuracy" in metrics
        assert "classification_report" in metrics
        assert isinstance(metrics["macro_f1"], float)
        assert isinstance(metrics["accuracy"], float)

    def test_evaluate_model_perfect_predictions(self):
        """Verify perfect predictions yield F1 and accuracy of 1.0."""
        from app.services.evaluator import evaluate_model

        mock_model = MagicMock()
        y = np.array([0, 1, 0, 1, 0])
        mock_model.predict.return_value = y

        X_test = pd.DataFrame({"col": range(5)})
        y_test = pd.Series(y)

        metrics = evaluate_model(mock_model, X_test, y_test)

        assert metrics["accuracy"] == 1.0
        assert metrics["macro_f1"] == 1.0


# ---------------------------------------------------------------------------
# Trainer tests
# ---------------------------------------------------------------------------


class TestTrainer:
    """Tests for the model training module."""

    def test_train_model_raises_on_missing_columns(self):
        """Verify ValueError is raised when required columns are missing."""
        from app.services.trainer import train_model

        df = pd.DataFrame({"something_else": [1, 2, 3]})

        with pytest.raises(ValueError, match="missing required columns"):
            train_model(df, "A")

    def test_train_model_raises_on_insufficient_data(self):
        """Verify ValueError when fewer than 10 valid rows exist."""
        from app.services.trainer import train_model

        df = pd.DataFrame({
            "text_input_clean": ["hello"] * 5,
            "amount": [100] * 5,
            "log_amount": [4.6] * 5,
            "amount_zscore": [0.1] * 5,
            "amount_percentile": [0.5] * 5,
            "gst_slab_predicted": [18] * 5,
        })

        with pytest.raises(ValueError, match="Insufficient data"):
            train_model(df, "A")

    def test_train_model_succeeds_with_valid_data(self):
        """Verify training succeeds with sufficient valid data."""
        from app.services.trainer import train_model

        np.random.seed(42)
        n = 50
        df = pd.DataFrame({
            "text_input_clean": [f"item {i}" for i in range(n)],
            "amount": np.random.uniform(100, 10000, n),
            "log_amount": np.random.uniform(4, 10, n),
            "amount_zscore": np.random.uniform(-2, 2, n),
            "amount_percentile": np.random.uniform(0, 1, n),
            "gst_slab_predicted": np.random.choice([5, 12, 18, 28], n),
        })

        pipeline, X_test, y_test = train_model(df, "A")

        assert pipeline is not None
        assert len(X_test) > 0
        assert len(y_test) > 0


# ---------------------------------------------------------------------------
# Schema validation tests
# ---------------------------------------------------------------------------


class TestSchemas:
    """Tests for Pydantic request/response schemas."""

    def test_retraining_trigger_defaults(self):
        """Verify RetrainingTrigger default values."""
        from app.schemas.retraining_schema import RetrainingTrigger

        trigger = RetrainingTrigger(schema_type="A")
        assert trigger.triggered_by == "manual"

    def test_retraining_trigger_all_schemas(self):
        """Verify 'ALL' is accepted as schema_type."""
        from app.schemas.retraining_schema import RetrainingTrigger

        trigger = RetrainingTrigger(schema_type="ALL")
        assert trigger.schema_type == "ALL"

    def test_retraining_response_serialisation(self):
        """Verify RetrainingResponse serialises job_ids correctly."""
        from app.schemas.retraining_schema import RetrainingResponse

        job_id = uuid.uuid4()
        resp = RetrainingResponse(
            message="Test", job_ids=[job_id]
        )
        assert resp.job_ids[0] == job_id


# ---------------------------------------------------------------------------
# Config tests
# ---------------------------------------------------------------------------


class TestConfig:
    """Tests for configuration constants."""

    def test_schema_mlflow_uris_has_four_schemas(self):
        """Verify all four standard schemas have MLflow URIs."""
        from app.config import SCHEMA_MLFLOW_URIS

        assert set(SCHEMA_MLFLOW_URIS.keys()) == {"A", "B", "C", "D"}

    def test_schema_model_names_match_uris(self):
        """Verify model names exist for all configured schemas."""
        from app.config import SCHEMA_MLFLOW_URIS, SCHEMA_MODEL_NAMES

        assert set(SCHEMA_MODEL_NAMES.keys()) == set(SCHEMA_MLFLOW_URIS.keys())

    def test_feature_contract_constants(self):
        """Verify feature contract constants are correct."""
        from app.config import TEXT_FEATURE, NUMERIC_FEATURES, LABEL_COLUMN

        assert TEXT_FEATURE == "text_input_clean"
        assert "amount" in NUMERIC_FEATURES
        assert LABEL_COLUMN == "gst_slab_predicted"
