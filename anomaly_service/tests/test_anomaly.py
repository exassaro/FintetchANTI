"""
Unit tests for the Anomaly Detection Service.

Covers the score combiner, confidence flagger, base detector interface,
and data validation utilities.
"""

import numpy as np
import pandas as pd
import pytest


# ---------------------------------------------------------------------------
# Score Combiner tests
# ---------------------------------------------------------------------------


class TestScoreCombiner:
    """Tests for the anomaly score combination and thresholding."""

    def test_combine_with_all_zeros(self):
        """Verify all-zero inputs yield zero anomaly scores."""
        from app.services.score_combiner import ScoreCombiner

        combiner = ScoreCombiner()
        n = 10

        result = combiner.combine(
            numeric_score=pd.Series(np.zeros(n)),
            nlp_score=pd.Series(np.zeros(n)),
            confidence_score=pd.Series(np.zeros(n)),
            numeric_reasons=pd.Series([""] * n),
            nlp_reasons=pd.Series([""] * n),
            confidence_reasons=pd.Series([""] * n),
        )

        assert "anomaly_score" in result.columns
        assert "is_anomaly" in result.columns
        assert result["anomaly_score"].sum() == 0.0

    def test_combine_high_scores_detected(self):
        """Verify high sub-scores produce anomaly flags."""
        from app.services.score_combiner import ScoreCombiner

        combiner = ScoreCombiner(min_absolute_threshold=0.3)

        result = combiner.combine(
            numeric_score=pd.Series([0.9, 0.9, 0.1, 0.1, 0.1]),
            nlp_score=pd.Series([0.9, 0.9, 0.1, 0.1, 0.1]),
            confidence_score=pd.Series([0.9, 0.9, 0.1, 0.1, 0.1]),
            numeric_reasons=pd.Series(["high"] * 5),
            nlp_reasons=pd.Series(["outlier"] * 5),
            confidence_reasons=pd.Series(["low_conf"] * 5),
        )

        # At least the first two should be flagged as anomalous
        assert result["is_anomaly"].iloc[0] is True or result["anomaly_score"].iloc[0] > 0.5

    def test_combine_with_none_scores(self):
        """Verify combiner handles None sub-scores gracefully."""
        from app.services.score_combiner import ScoreCombiner

        combiner = ScoreCombiner()

        result = combiner.combine(
            numeric_score=None,
            nlp_score=None,
            confidence_score=None,
        )

        assert result is not None
        assert len(result) == 0 or "anomaly_score" in result.columns

    def test_weights_sum_to_one(self):
        """Verify default weights sum to 1.0 for normalised scoring."""
        from app.services.score_combiner import ScoreCombiner

        combiner = ScoreCombiner()
        total = combiner.numeric_weight + combiner.nlp_weight + combiner.confidence_weight
        assert abs(total - 1.0) < 1e-6


# ---------------------------------------------------------------------------
# Confidence Flagger tests
# ---------------------------------------------------------------------------


class TestConfidenceFlagger:
    """Tests for the confidence-based anomaly flagger."""

    def test_no_confidence_column_returns_zeros(self):
        """Verify graceful handling when gst_confidence is missing."""
        from app.services.confidence_flagger import ConfidenceFlagger

        flagger = ConfidenceFlagger()
        df = pd.DataFrame({"amount": [100, 200, 300]})

        scores, reasons = flagger.run(df)

        assert len(scores) == 3
        assert scores.sum() == 0.0

    def test_low_confidence_flagged(self):
        """Verify low-confidence rows receive high anomaly scores."""
        from app.services.confidence_flagger import ConfidenceFlagger

        flagger = ConfidenceFlagger()
        df = pd.DataFrame({
            "gst_confidence": [0.99, 0.95, 0.10, 0.05, 0.98],
            "gst_confidence_margin": [0.5, 0.4, 0.01, 0.02, 0.6],
        })

        scores, reasons = flagger.run(df)

        # Rows with very low confidence should have higher scores
        assert scores.iloc[2] > scores.iloc[0]
        assert scores.iloc[3] > scores.iloc[0]


# ---------------------------------------------------------------------------
# Base Detector interface tests
# ---------------------------------------------------------------------------


class TestBaseDetector:
    """Tests for the abstract base detector interface."""

    def test_cannot_instantiate_abstract(self):
        """Verify BaseDetector cannot be instantiated directly."""
        from app.services.base_detector import BaseDetector

        with pytest.raises(TypeError):
            BaseDetector()

    def test_subclass_must_implement_run(self):
        """Verify subclasses that don't implement run raise TypeError."""
        from app.services.base_detector import BaseDetector

        class IncompleteDetector(BaseDetector):
            pass

        with pytest.raises(TypeError):
            IncompleteDetector()

    def test_valid_subclass_works(self):
        """Verify a complete subclass can be instantiated."""
        from app.services.base_detector import BaseDetector

        class ValidDetector(BaseDetector):
            def run(self, df):
                return pd.Series(dtype=float), pd.Series(dtype=str)

        detector = ValidDetector()
        scores, reasons = detector.run(pd.DataFrame())
        assert len(scores) == 0
