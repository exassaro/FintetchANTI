from abc import ABC, abstractmethod
import pandas as pd


class BaseDetector(ABC):

    @abstractmethod
    def run(self, df: pd.DataFrame):
        pass