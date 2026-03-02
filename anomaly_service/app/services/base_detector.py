"""
Base detector interface for the Anomaly Detection Service.

All anomaly detectors (numeric, text, confidence) must inherit from
``BaseDetector`` and implement the ``run`` method.
"""

from abc import ABC, abstractmethod

import pandas as pd


class BaseDetector(ABC):
    """Abstract base class for anomaly detection components.

    Subclasses must implement ``run()`` which accepts a DataFrame
    and returns a tuple of ``(scores: pd.Series, reasons: pd.Series)``.
    """

    @abstractmethod
    def run(self, df: pd.DataFrame):
        """Run this detector on the given DataFrame.

        Args:
            df: Input DataFrame with classified transaction data.

        Returns:
            tuple: (anomaly_scores, anomaly_reasons) as pandas Series.
        """