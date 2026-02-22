import numpy as np
import pandas as pd

from .base_detector import BaseDetector


class ConfidenceFlagger(BaseDetector):

    def __init__(self):
        np.random.seed(42)

    def run(self, df: pd.DataFrame):

        if "gst_confidence" not in df.columns:
            return (
                pd.Series(0.0, index=df.index),
                pd.Series("none", index=df.index),
            )

        df = df.copy()

        confidence = df["gst_confidence"].fillna(1.0)

        n_samples = len(confidence)

    
        # Relative Confidence Deviation
    
        mean_conf = confidence.mean()
        std_conf = confidence.std()

        if std_conf > 0:
            z_scores = (mean_conf - confidence) / std_conf
            z_scores = z_scores.clip(lower=0)  # only low confidence matters
        else:
            z_scores = np.zeros(n_samples)

        z_min, z_max = z_scores.min(), z_scores.max()

        if z_max > z_min:
            relative_score = (z_scores - z_min) / (z_max - z_min)
        else:
            relative_score = np.zeros(n_samples)

    
        # Confidence Margin 
    

        if "gst_confidence_margin" in df.columns:

            margin = df["gst_confidence_margin"].fillna(1.0)

            # Low margin → more uncertain
            inv_margin = 1.0 - margin

            m_min, m_max = inv_margin.min(), inv_margin.max()

            if m_max > m_min:
                margin_score = (inv_margin - m_min) / (m_max - m_min)
            else:
                margin_score = np.zeros(n_samples)

        else:
            margin_score = np.zeros(n_samples)

        
        # Composite Confidence Score
        

        confidence_score = (
            0.6 * relative_score +
            0.4 * margin_score
        ).clip(0, 1)

        
        # Adaptive Reason Generation
        

        reasons = []

        for i in range(n_samples):

            row_reasons = []

            if relative_score[i] > 0.8:
                row_reasons.append("unusually low classification confidence")

            if margin_score[i] > 0.8:
                row_reasons.append("low confidence margin between top classes")

            if not row_reasons:
                row_reasons.append("none")

            reasons.append("; ".join(row_reasons))

        return pd.Series(confidence_score), pd.Series(reasons)