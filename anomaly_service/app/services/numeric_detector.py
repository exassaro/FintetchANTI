import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from .base_detector import BaseDetector


class NumericDetector(BaseDetector):

    def __init__(self):
        np.random.seed(42)
        torch.manual_seed(42)

    def run(self, df: pd.DataFrame):

        df = df.copy()

        numeric_features = [
            c for c in [
                "amount",
                "log_amount",
                "amount_zscore",
                "amount_percentile",
                "amount_month_interaction",
            ]
            if c in df.columns
        ]

        if not numeric_features:
            return (
                pd.Series(0.0, index=df.index),
                pd.Series("none", index=df.index),
            )

        # -----------------------------
        # Basic numeric safety
        # -----------------------------

        df[numeric_features] = df[numeric_features].fillna(
            df[numeric_features].median()
        )

        n_samples = len(df)

        # ============================================================
        # 1️⃣ Isolation Forest (Slab-conditioned + Global fallback)
        # ============================================================

        MIN_SLAB_SIZE = 30

        df["numeric_score_iforest"] = 0.0

        scaler_global = StandardScaler()
        X_global_scaled = scaler_global.fit_transform(df[numeric_features])

        # For very small datasets, skip IF training
        if n_samples >= 20:

            global_iso = IsolationForest(
                n_estimators=200,
                contamination="auto",
                random_state=42
            )

            global_iso.fit(X_global_scaled)

            global_raw = global_iso.score_samples(X_global_scaled)
            gmin, gmax = global_raw.min(), global_raw.max()

            global_score = 1.0 - (
                (global_raw - gmin) / (gmax - gmin + 1e-8)
            )

        else:
            global_score = np.zeros(n_samples)

        df["numeric_score_iforest_global"] = global_score

        if "gst_slab_predicted" in df.columns and n_samples >= MIN_SLAB_SIZE:

            for slab in df["gst_slab_predicted"].dropna().unique():

                slab_mask = df["gst_slab_predicted"] == slab
                slab_df = df.loc[slab_mask]

                if len(slab_df) >= MIN_SLAB_SIZE:

                    scaler = StandardScaler()
                    X_scaled = scaler.fit_transform(
                        slab_df[numeric_features]
                    )

                    iso = IsolationForest(
                        n_estimators=200,
                        contamination="auto",
                        random_state=42
                    )

                    iso.fit(X_scaled)

                    raw = iso.score_samples(X_scaled)
                    rmin, rmax = raw.min(), raw.max()

                    slab_score = 1.0 - (
                        (raw - rmin) / (rmax - rmin + 1e-8)
                    )

                    df.loc[slab_mask, "numeric_score_iforest"] = slab_score

                else:
                    df.loc[slab_mask, "numeric_score_iforest"] = \
                        df.loc[slab_mask, "numeric_score_iforest_global"]

        else:
            df["numeric_score_iforest"] = df["numeric_score_iforest_global"]

        # Cleanup helper column
        df.drop(columns=["numeric_score_iforest_global"], inplace=True)

        # ============================================================
        # 2️⃣ Statistical Scores
        # ============================================================

        # Z-score
        if "amount_zscore" in df.columns:
            z_abs = df["amount_zscore"].abs().fillna(0)
            df["numeric_score_z"] = (z_abs / 5.0).clip(0, 1)
        else:
            df["numeric_score_z"] = 0.0

        # IQR (only if amount exists)
        if "amount" in df.columns:
            q1 = df["amount"].quantile(0.25)
            q3 = df["amount"].quantile(0.75)
            iqr = q3 - q1

            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr

            dist_lower = np.where(
                df["amount"] < lower,
                lower - df["amount"],
                0.0
            )
            dist_upper = np.where(
                df["amount"] > upper,
                df["amount"] - upper,
                0.0
            )

            dist_total = dist_lower + dist_upper

            if dist_total.max() > 0:
                df["numeric_score_iqr"] = dist_total / dist_total.max()
            else:
                df["numeric_score_iqr"] = 0.0
        else:
            df["numeric_score_iqr"] = 0.0

        # ============================================================
        # 3️⃣ Autoencoder (Optimized for Large Uploads)
        # ============================================================

        MAX_TRAIN_SAMPLES = 20000

        if n_samples >= 50:  # skip AE if dataset too small

            X = df[numeric_features].values
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)

            if n_samples > MAX_TRAIN_SAMPLES:
                train_idx = np.random.choice(
                    n_samples,
                    MAX_TRAIN_SAMPLES,
                    replace=False
                )
                X_train = X_scaled[train_idx]
            else:
                X_train = X_scaled

            if n_samples < 5000:
                n_epochs = 15
            elif n_samples < 20000:
                n_epochs = 10
            else:
                n_epochs = 5

            input_dim = X_scaled.shape[1]
            encoding_dim = max(4, input_dim // 2)

            autoencoder = nn.Sequential(
                nn.Linear(input_dim, encoding_dim),
                nn.ReLU(),
                nn.Linear(encoding_dim, encoding_dim),
                nn.ReLU(),
                nn.Linear(encoding_dim, input_dim),
            )

            generator = torch.Generator().manual_seed(42)

            dataset = TensorDataset(
                torch.tensor(X_train, dtype=torch.float32)
            )

            dataloader = DataLoader(
                dataset,
                batch_size=256,
                shuffle=True,
                generator=generator
            )

            optimizer = torch.optim.Adam(
                autoencoder.parameters(),
                lr=1e-3
            )

            criterion = nn.MSELoss()

            autoencoder.train()
            for _ in range(n_epochs):
                for (batch_x,) in dataloader:
                    optimizer.zero_grad()
                    recon = autoencoder(batch_x)
                    loss = criterion(recon, batch_x)
                    loss.backward()
                    optimizer.step()

            autoencoder.eval()
            with torch.no_grad():
                X_tensor = torch.tensor(
                    X_scaled,
                    dtype=torch.float32
                )
                recon_all = autoencoder(X_tensor)
                recon_error = (
                    (recon_all - X_tensor) ** 2
                ).mean(dim=1).numpy()

            err_min, err_max = recon_error.min(), recon_error.max()

            if err_max > err_min:
                df["numeric_score_ae"] = (
                    (recon_error - err_min)
                    / (err_max - err_min + 1e-8)
                )
            else:
                df["numeric_score_ae"] = 0.0

        else:
            df["numeric_score_ae"] = 0.0

        # ============================================================
        # 4️⃣ Composite Score
        # ============================================================

        numeric_score = (
            0.35 * df["numeric_score_iforest"] +
            0.30 * df["numeric_score_ae"] +
            0.20 * df["numeric_score_z"] +
            0.15 * df["numeric_score_iqr"]
        ).clip(0, 1)

        # ============================================================
        # 5️⃣ Reason Builder
        # ============================================================

        def build_reason(row):
            reasons = []

            if row["numeric_score_iforest"] > 0.8:
                reasons.append("slab-conditioned IsolationForest anomaly")
            if row["numeric_score_ae"] > 0.8:
                reasons.append("high reconstruction error")
            if row["numeric_score_z"] > 0.8:
                reasons.append("extreme amount z-score")
            if row["numeric_score_iqr"] > 0.8:
                reasons.append("amount outside IQR range")

            return "; ".join(reasons) if reasons else "none"

        reasons = df.apply(build_reason, axis=1)

        return numeric_score, reasons