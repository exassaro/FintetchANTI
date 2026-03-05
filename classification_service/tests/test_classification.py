"""
Unit tests for the Classification Service.

Covers schema detection, column normalisation, preprocessing,
and configuration constants.
"""

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Schema Detector tests
# ---------------------------------------------------------------------------


class TestSchemaDetector:
    """Tests for CSV schema detection."""

    def test_detect_schema_a(self):
        """Schema A: description + category + vendor_name."""
        from app.services.schema_detector import detect_schema

        df = pd.DataFrame({
            "amount": [100],
            "description": ["item"],
            "category": ["office"],
            "vendor_name": ["vendor1"],
        })
        assert detect_schema(df) == "A"

    def test_detect_schema_b(self):
        """Schema B: description + category only."""
        from app.services.schema_detector import detect_schema

        df = pd.DataFrame({
            "amount": [100],
            "description": ["item"],
            "category": ["office"],
        })
        assert detect_schema(df) == "B"

    def test_detect_schema_d(self):
        """Schema D: description only."""
        from app.services.schema_detector import detect_schema

        df = pd.DataFrame({
            "description": ["item"],
            "amount": [100],
        })
        assert detect_schema(df) == "D"

    def test_detect_schema_e_no_description(self):
        """Schema E: no usable text columns."""
        from app.services.schema_detector import detect_schema

        df = pd.DataFrame({
            "amount": [100],
            "gst_slab": [18],
        })
        assert detect_schema(df) == "E"


# ---------------------------------------------------------------------------
# Preprocessing tests
# ---------------------------------------------------------------------------


class TestPreprocessing:
    """Tests for text cleaning and feature engineering."""

    def test_clean_text_series_basic(self):
        """Verify text cleaning removes special characters and lowercases."""
        from app.services.preprocessing import clean_text_series

        s = pd.Series(["Hello, World! 123", "  UPPER case  "])
        cleaned = clean_text_series(s)

        assert cleaned.iloc[0] == "hello world 123"
        assert cleaned.iloc[1] == "upper case"

    def test_clean_text_series_handles_nan(self):
        """Verify NaN values are handled gracefully."""
        from app.services.preprocessing import clean_text_series

        s = pd.Series([None, np.nan, "valid text"])
        cleaned = clean_text_series(s)

        assert cleaned.iloc[0] == ""
        assert cleaned.iloc[1] == ""
        assert cleaned.iloc[2] == "valid text"

    def test_is_effectively_nonempty_text(self):
        """Verify non-empty detection works correctly."""
        from app.services.preprocessing import is_effectively_nonempty_text

        s = pd.Series(["hello", "", "   ", None, "valid"])
        result = is_effectively_nonempty_text(s)
        assert result.iloc[0]
        assert not result.iloc[1]
        assert not result.iloc[2]
        assert result.iloc[4]


# ---------------------------------------------------------------------------
# Column Normalizer tests
# ---------------------------------------------------------------------------


class TestColumnNormalizer:
    """Tests for column name normalisation."""

    def test_normalize_standard_columns(self):
        """Verify standard column names are detected and mapped."""
        from app.services.column_normalizer import normalize_columns

        df = pd.DataFrame({
            "Description": ["item"],
            "Amount": [100],
            "Vendor Name": ["v1"],
        })

        normalized, _ = normalize_columns(df)

        assert "description" in normalized.columns
        assert "amount" in normalized.columns
        assert "vendor_name" in normalized.columns

    def test_normalize_preserves_data(self):
        """Verify normalisation doesn't alter data values."""
        from app.services.column_normalizer import normalize_columns

        df = pd.DataFrame({
            "description": ["test item"],
            "amount": [500.50],
        })

        normalized, _ = normalize_columns(df)

        assert normalized["description"].iloc[0] == "test item"
        assert normalized["amount"].iloc[0] == 500.50


# ---------------------------------------------------------------------------
# Config tests
# ---------------------------------------------------------------------------


class TestClassificationConfig:
    """Tests for classification configuration constants."""

    def test_feature_contract(self):
        """Verify feature contract constants exist."""
        from app.core.config import TEXT_FEATURE, NUMERIC_FEATURES

        assert TEXT_FEATURE == "text_input_clean"
        assert isinstance(NUMERIC_FEATURES, list)
        assert len(NUMERIC_FEATURES) == 4

    def test_schema_mlflow_uris(self):
        """Verify MLflow URIs are configured for all schemas."""
        from app.core.config import SCHEMA_MLFLOW_URIS

        for schema in ["A", "B", "C", "D"]:
            assert schema in SCHEMA_MLFLOW_URIS
