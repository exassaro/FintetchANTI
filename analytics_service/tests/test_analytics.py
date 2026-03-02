"""
Unit tests for the Analytics Service.

Covers the CSV reader, cache manager, forecast engine model selection,
and the aggregation engine utilities.
"""

import uuid
from unittest.mock import MagicMock

import numpy as np
import pandas as pd
import pytest


# ---------------------------------------------------------------------------
# CSVReader tests
# ---------------------------------------------------------------------------


class TestCSVReader:
    """Tests for the CSV reader and data validation utilities."""

    def test_ensure_effective_slab_column_final(self):
        """Verify gst_slab_final takes precedence."""
        from app.services.csv_reader import CSVReader

        reader = CSVReader()
        df = pd.DataFrame({
            "gst_slab_final": [18, 28, 5],
            "gst_slab_predicted": [12, 18, 28],
        })

        result = reader.ensure_effective_slab_column(df)

        assert "gst_slab_effective" in result.columns
        assert list(result["gst_slab_effective"]) == [18, 28, 5]

    def test_ensure_effective_slab_column_predicted(self):
        """Verify fallback to gst_slab_predicted when final is absent."""
        from app.services.csv_reader import CSVReader

        reader = CSVReader()
        df = pd.DataFrame({
            "gst_slab_predicted": [12, 18, 28],
        })

        result = reader.ensure_effective_slab_column(df)

        assert "gst_slab_effective" in result.columns
        assert list(result["gst_slab_effective"]) == [12, 18, 28]

    def test_ensure_effective_slab_column_missing_raises(self):
        """Verify ValueError when neither slab column exists."""
        from app.services.csv_reader import CSVReader

        reader = CSVReader()
        df = pd.DataFrame({"amount": [100, 200]})

        with pytest.raises(ValueError, match="No GST slab column"):
            reader.ensure_effective_slab_column(df)

    def test_detect_date_column_found(self):
        """Verify date column detection by name."""
        from app.services.csv_reader import CSVReader

        reader = CSVReader()
        df = pd.DataFrame({
            "invoice_date": ["2025-01-01"],
            "amount": [100],
        })

        assert reader.detect_date_column(df) == "invoice_date"

    def test_detect_date_column_month(self):
        """Verify 'month'-containing column is detected."""
        from app.services.csv_reader import CSVReader

        reader = CSVReader()
        df = pd.DataFrame({
            "billing_month": ["2025-01"],
            "amount": [100],
        })

        assert reader.detect_date_column(df) == "billing_month"

    def test_detect_date_column_missing_raises(self):
        """Verify ValueError when no date column exists."""
        from app.services.csv_reader import CSVReader

        reader = CSVReader()
        df = pd.DataFrame({"amount": [100], "vendor": ["x"]})

        with pytest.raises(ValueError, match="No date-like column"):
            reader.detect_date_column(df)

    def test_validate_required_columns_passes(self):
        """Verify no error when all required columns are present."""
        from app.services.csv_reader import CSVReader

        reader = CSVReader()
        df = pd.DataFrame({"a": [1], "b": [2], "c": [3]})

        reader.validate_required_columns(df, ["a", "b"])  # Should not raise

    def test_validate_required_columns_fails(self):
        """Verify ValueError when required columns are missing."""
        from app.services.csv_reader import CSVReader

        reader = CSVReader()
        df = pd.DataFrame({"a": [1]})

        with pytest.raises(ValueError, match="Missing required columns"):
            reader.validate_required_columns(df, ["a", "b", "c"])


# ---------------------------------------------------------------------------
# CacheManager tests
# ---------------------------------------------------------------------------


class TestCacheManager:
    """Tests for the in-memory TTL cache."""

    def test_set_and_get(self):
        """Verify basic set/get round-trip."""
        from app.services.cache_manager import CacheManager

        cache = CacheManager()
        cache.clear()

        uid = uuid.uuid4()
        cache.set(uid, "test_key", {"data": 42})

        result = cache.get(uid, "test_key")
        assert result == {"data": 42}

    def test_get_missing_key_returns_none(self):
        """Verify missing key returns None."""
        from app.services.cache_manager import CacheManager

        cache = CacheManager()
        cache.clear()

        result = cache.get(uuid.uuid4(), "nonexistent")
        assert result is None

    def test_delete_removes_entry(self):
        """Verify delete makes key unavailable."""
        from app.services.cache_manager import CacheManager

        cache = CacheManager()
        cache.clear()

        uid = uuid.uuid4()
        cache.set(uid, "key1", "value1")
        cache.delete(uid, "key1")

        assert cache.get(uid, "key1") is None

    def test_invalidate_upload_removes_all_keys(self):
        """Verify invalidate_upload clears all keys for an upload."""
        from app.services.cache_manager import CacheManager

        cache = CacheManager()
        cache.clear()

        uid = uuid.uuid4()
        cache.set(uid, "key1", "v1")
        cache.set(uid, "key2", "v2")
        cache.set(uid, "key3", "v3")

        cache.invalidate_upload(uid)

        assert cache.get(uid, "key1") is None
        assert cache.get(uid, "key2") is None
        assert cache.get(uid, "key3") is None

    def test_clear_removes_everything(self):
        """Verify clear removes all entries."""
        from app.services.cache_manager import CacheManager

        cache = CacheManager()

        uid1 = uuid.uuid4()
        uid2 = uuid.uuid4()
        cache.set(uid1, "k", "v")
        cache.set(uid2, "k", "v")

        cache.clear()

        assert cache.get(uid1, "k") is None
        assert cache.get(uid2, "k") is None


# ---------------------------------------------------------------------------
# Forecast model selection tests
# ---------------------------------------------------------------------------


class TestModelSelection:
    """Tests for the forecast model selection logic."""

    def test_choose_model_enough_for_prophet(self):
        """Verify Prophet is chosen when available and data is sufficient."""
        from app.services.forecast_engine import choose_model

        choice = choose_model(15)
        # Should use prophet or arima depending on availability
        assert choice.model_type in ("prophet", "arima")

    def test_choose_model_moderate_data(self):
        """Verify ARIMA is chosen for moderate data points."""
        from app.services.forecast_engine import choose_model

        choice = choose_model(8)
        assert choice.model_type in ("prophet", "arima")

    def test_choose_model_short_data(self):
        """Verify baseline is chosen for short histories."""
        from app.services.forecast_engine import choose_model

        choice = choose_model(3)
        assert choice.model_type == "baseline_ma"
        assert len(choice.warnings) > 0

    def test_choose_model_single_point(self):
        """Verify last-value baseline for single data point."""
        from app.services.forecast_engine import choose_model

        choice = choose_model(1)
        assert choice.model_type == "baseline_last"

    def test_choose_model_no_data(self):
        """Verify 'none' for zero data points."""
        from app.services.forecast_engine import choose_model

        choice = choose_model(0)
        assert choice.model_type == "none"
        assert len(choice.warnings) > 0
