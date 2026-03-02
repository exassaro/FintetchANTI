"""
Text-based Anomaly Detector.

Uses sentence embeddings (MiniLM), KMeans clustering, kNN density,
frequency rarity, and text length extremes to compute a composite
NLP anomaly score per row.
"""

import logging

import numpy as np
import pandas as pd
from sklearn.cluster import MiniBatchKMeans
from sklearn.neighbors import NearestNeighbors
from sentence_transformers import SentenceTransformer

from .base_detector import BaseDetector

logger = logging.getLogger(__name__)


class TextDetector(BaseDetector):
    """Detect anomalies based on text semantics and patterns.

    Uses sentence transformer embeddings, clustering distance,
    kNN density, frequency rarity, and text length analysis.
    """

    def __init__(self):
        """Initialize the sentence transformer model."""
        np.random.seed(42)
        self.model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

    def run(self, df: pd.DataFrame):
        """Compute composite NLP anomaly scores.

        Args:
            df: DataFrame with ``text_input_clean`` column.

        Returns:
            tuple: (nlp_score, reasons) as pandas Series.
        """

        if "text_input_clean" not in df.columns:
            return (
                pd.Series(0.0, index=df.index),
                pd.Series("none", index=df.index),
            )

        df = df.copy()
        df["text_input_clean"] = df["text_input_clean"].fillna("")
        df["text_len"] = df["text_input_clean"].str.len()

        n_samples = len(df)

        
        # Text Length Extremes
       

        l_min, l_max = df["text_len"].min(), df["text_len"].max()

        if l_max > l_min:
            length_norm = (df["text_len"] - l_min) / (l_max - l_min)
        else:
            length_norm = np.zeros(n_samples)

        length_score = np.abs(length_norm - 0.5) * 2.0
        length_score = pd.Series(length_score, index=df.index)

        
        # Description Frequency Rarity
        

        desc_counts = df["text_input_clean"].value_counts()
        df["desc_frequency"] = df["text_input_clean"].map(desc_counts)

        inv_freq = 1.0 / df["desc_frequency"].astype(float)
        f_min, f_max = inv_freq.min(), inv_freq.max()

        if f_max > f_min:
            freq_score = (inv_freq - f_min) / (f_max - f_min)
        else:
            freq_score = np.zeros(n_samples)

        freq_score = pd.Series(freq_score, index=df.index)

        
        
        # Sentence Embeddings
        

        embeddings = self.model.encode(
            df["text_input_clean"].tolist(),
            batch_size=256,
            show_progress_bar=False,
            convert_to_numpy=True
        )

        
        # KMeans Cluster Distance
        

        n_clusters = max(5, min(30, n_samples // 100 or 5))

        kmeans = MiniBatchKMeans(
            n_clusters=n_clusters,
            batch_size=1024,
            random_state=42
        )

        kmeans.fit(embeddings)
        cluster_labels = kmeans.predict(embeddings)
        centroids = kmeans.cluster_centers_

        dists = np.linalg.norm(
            embeddings - centroids[cluster_labels],
            axis=1
        )

        d_min, d_max = dists.min(), dists.max()

        if d_max > d_min:
            cluster_distance_score = (dists - d_min) / (d_max - d_min)
        else:
            cluster_distance_score = np.zeros(n_samples)

        cluster_distance_score = pd.Series(cluster_distance_score, index=df.index)

        
        # kNN Density Anomaly
        

        k_neighbors = min(10, max(3, n_samples // 200 or 3))

        knn = NearestNeighbors(n_neighbors=k_neighbors)
        knn.fit(embeddings)

        dists_knn, _ = knn.kneighbors(embeddings)
        mean_dist = dists_knn.mean(axis=1)

        md_min, md_max = mean_dist.min(), mean_dist.max()

        if md_max > md_min:
            knn_score = (mean_dist - md_min) / (md_max - md_min)
        else:
            knn_score = np.zeros(n_samples)

        knn_score = pd.Series(knn_score, index=df.index)

        
        # Cluster Rarity
        

        cluster_counts = pd.Series(cluster_labels).value_counts()
        cluster_freq = pd.Series(cluster_labels).map(cluster_counts)

        inv_cluster_freq = 1.0 / cluster_freq.astype(float)
        cf_min, cf_max = inv_cluster_freq.min(), inv_cluster_freq.max()

        if cf_max > cf_min:
            cluster_rarity_score = (
                (inv_cluster_freq - cf_min) / (cf_max - cf_min)
            )
        else:
            cluster_rarity_score = np.zeros(n_samples)

        cluster_rarity_score = pd.Series(cluster_rarity_score, index=df.index)

    
        # Composite NLP Score
        
        nlp_score = (
            0.25 * cluster_distance_score +
            0.20 * knn_score +
            0.20 * cluster_rarity_score +
            0.20 * freq_score +
            0.15 * length_score
        ).clip(0, 1)

        
        # Reason Generation
        

        reasons = []

        for i in range(n_samples):

            row_reasons = []

            if cluster_distance_score.iloc[i] > 0.8:
                row_reasons.append("far from cluster centroid")

            if knn_score.iloc[i] > 0.8:
                row_reasons.append("sparse semantic neighborhood")

            if cluster_rarity_score.iloc[i] > 0.8:
                row_reasons.append("rare semantic cluster")

            if freq_score.iloc[i] > 0.8:
                row_reasons.append("rare description pattern")

            if length_score.iloc[i] > 0.8:
                row_reasons.append("unusual description length")

            if not row_reasons:
                row_reasons.append("none")

            reasons.append("; ".join(row_reasons))

        return nlp_score, pd.Series(reasons, index=df.index)