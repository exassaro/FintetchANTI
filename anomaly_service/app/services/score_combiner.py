"""
Score Combiner for the Anomaly Detection Service.

Weights and combines numeric, NLP, and confidence anomaly scores
into a single composite score, applies adaptive thresholding,
and aggregates detection reasons.
"""

import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class ScoreCombiner:
    """Combine multiple anomaly sub-scores with adaptive thresholding.

    Attributes:
        numeric_weight: Weight for numeric detector score.
        nlp_weight: Weight for text detector score.
        confidence_weight: Weight for confidence flagger score.
        adaptive_quantile: Quantile for dynamic threshold.
        min_absolute_threshold: Minimum threshold floor.
    """

    def __init__(
        self,
        numeric_weight=0.40,
        nlp_weight=0.35,
        confidence_weight=0.25,
        adaptive_quantile=0.90,
        min_absolute_threshold=0.40,
    ):
        """Initialize the score combiner with configurable weights.

        Args:
            numeric_weight: Weight for numeric detector. Defaults to 0.40.
            nlp_weight: Weight for NLP detector. Defaults to 0.35.
            confidence_weight: Weight for confidence flagger. Defaults to 0.25.
            adaptive_quantile: Quantile for threshold. Defaults to 0.90.
            min_absolute_threshold: Floor threshold. Defaults to 0.40.
        """

        self.numeric_weight = numeric_weight
        self.nlp_weight = nlp_weight
        self.confidence_weight = confidence_weight

        self.adaptive_quantile = adaptive_quantile
        self.min_absolute_threshold = min_absolute_threshold

    def combine(
        self,
        numeric_score: pd.Series = None,
        nlp_score: pd.Series = None,
        confidence_score: pd.Series = None,
        numeric_reasons: pd.Series = None,
        nlp_reasons: pd.Series = None,
        confidence_reasons: pd.Series = None,
    ):
        """Combine sub-scores into a final anomaly determination.

        Args:
            numeric_score: Scores from the numeric detector.
            nlp_score: Scores from the text detector.
            confidence_score: Scores from the confidence flagger.
            numeric_reasons: Reasons from the numeric detector.
            nlp_reasons: Reasons from the text detector.
            confidence_reasons: Reasons from the confidence flagger.

        Returns:
            pd.DataFrame: With columns anomaly_score, is_anomaly,
                          adaptive_threshold_used, and anomaly_reasons.
        """

        
        # Safe Initialization
        

        n = 0
        if numeric_score is not None:
            n = len(numeric_score)
        elif nlp_score is not None:
            n = len(nlp_score)
        elif confidence_score is not None:
            n = len(confidence_score)

        if numeric_score is None:
            numeric_score = pd.Series(0.0, index=range(n))
        if nlp_score is None:
            nlp_score = pd.Series(0.0, index=range(n))
        if confidence_score is None:
            confidence_score = pd.Series(0.0, index=range(n))

        # Ensure normalization safety
        numeric_score = numeric_score.clip(0, 1)
        nlp_score = nlp_score.clip(0, 1)
        confidence_score = confidence_score.clip(0, 1)

        
        # Composite Score
        

        anomaly_score = (
            self.numeric_weight * numeric_score +
            self.nlp_weight * nlp_score +
            self.confidence_weight * confidence_score
        ).clip(0, 1)

        
        # Adaptive Thresholding
        

        # Default to the minimum absolute threshold (e.g., 0.40)
        threshold = float(self.min_absolute_threshold)

        # For larger datasets, apply the quantile logic so we don't flag too many
        if n >= 20:
            quantile_threshold = float(anomaly_score.quantile(self.adaptive_quantile))
            threshold = max(threshold, quantile_threshold)

        is_anomaly = (anomaly_score >= threshold).astype(bool)

        
        # Reason Aggregation
        

        combined_reasons = []

        for i in range(n):

            reasons = []

            if numeric_reasons is not None:
                nr = numeric_reasons.iloc[i]
                if nr != "none":
                    reasons.append(nr)

            if nlp_reasons is not None:
                tr = nlp_reasons.iloc[i]
                if tr != "none":
                    reasons.append(tr)

            if confidence_reasons is not None:
                cr = confidence_reasons.iloc[i]
                if cr != "none":
                    reasons.append(cr)

            if not reasons:
                reasons.append("none")

            combined_reasons.append("; ".join(reasons))

        
        
        # Return Structured Output
        

        result_df = pd.DataFrame({
            "anomaly_score": anomaly_score,
            "is_anomaly": is_anomaly,
            "adaptive_threshold_used": threshold,
            "anomaly_reasons": combined_reasons
        })

        return result_df