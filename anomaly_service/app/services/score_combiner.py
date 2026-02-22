import numpy as np
import pandas as pd


class ScoreCombiner:

    def __init__(
        self,
        numeric_weight=0.40,
        nlp_weight=0.35,
        confidence_weight=0.25,
        adaptive_quantile=0.90,
        min_absolute_threshold=0.40
    ):

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

        
        # Safe Initialization
        

        n = len(
            numeric_score
            if numeric_score is not None
            else (
                nlp_score if nlp_score is not None
                else confidence_score
            )
        )

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