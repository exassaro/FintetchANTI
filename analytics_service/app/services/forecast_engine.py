# app/services/forecast_engine.py

import uuid
import warnings
from dataclasses import dataclass
from typing import Dict, Any, List

import numpy as np
import pandas as pd

from dateutil.relativedelta import relativedelta
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tools.sm_exceptions import ConvergenceWarning

from app.services.csv_reader import CSVReader
from app.services.cache_manager import CacheManager
from app.config import settings

warnings.filterwarnings("ignore", category=ConvergenceWarning)

# Optional Prophet
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False


# ======================================================
# CONFIGURATION
# ======================================================

MIN_POINTS_PROPHET = 12
MIN_POINTS_ARIMA = 6
FORECAST_HORIZON = 6
ITC_ELIGIBLE_SLABS = {5, 18, 40}

HISTORY_KEY = "history"
FORECAST_KEY = "forecast"
META_KEY = "meta"


# ======================================================
# MODEL SELECTION
# ======================================================

@dataclass
class ModelChoice:
    model_type: str
    reason: str
    warnings: List[str]
    horizon_months: int


def choose_model(n_points: int) -> ModelChoice:

    warnings_list: List[str] = []

    if n_points >= MIN_POINTS_PROPHET and PROPHET_AVAILABLE:
        model_type = "prophet"
        reason = "Sufficient history for Prophet."
    elif n_points >= MIN_POINTS_PROPHET and not PROPHET_AVAILABLE:
        model_type = "arima"
        reason = "Prophet unavailable; using ARIMA."
    elif n_points >= MIN_POINTS_ARIMA:
        model_type = "arima"
        reason = "Moderate history; using ARIMA."
    elif n_points >= 2:
        model_type = "baseline_ma"
        reason = "Short history; using moving average."
        warnings_list.append("Forecast uncertain due to limited data.")
    elif n_points == 1:
        model_type = "baseline_last"
        reason = "Single data point; using last-value baseline."
        warnings_list.append("Forecast statistically weak.")
    else:
        model_type = "none"
        reason = "No data available."
        warnings_list.append("Cannot produce forecast.")

    return ModelChoice(
        model_type=model_type,
        reason=reason,
        warnings=warnings_list,
        horizon_months=FORECAST_HORIZON,
    )


# ======================================================
# FORECAST ENGINE
# ======================================================

class ForecastEngine:

    def __init__(self):
        self.csv_reader = CSVReader()
        self.cache = CacheManager()

    # ======================================================
    # PUBLIC ENTRY
    # ======================================================

    def run_forecast(
        self,
        upload_id: uuid.UUID,
        anomaly_file_path: str,
        metric: str,
        exclude_anomalies: bool = True,
    ) -> Dict[str, Any]:

        cache_key = f"forecast:{metric}:{exclude_anomalies}"
        cached = self.cache.get(upload_id, cache_key)
        if cached:
            return cached

        # Minimal required columns
        required_cols = [
            "amount",
            "gst_slab_final",
            "gst_slab_predicted",
            "numeric_anomaly_candidate",
        ]

        df = self.csv_reader.load_dataframe(
            upload_id,
            anomaly_file_path,
            columns=None,  # full load for safety in forecasting
        )

        df = self.csv_reader.ensure_effective_slab_column(df)

        date_col = self.csv_reader.detect_date_column(df)

        df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
        df = df.dropna(subset=[date_col])

        # Derive GST features
        df = self._derive_gst_features(df)

        # Optional anomaly exclusion
        if exclude_anomalies and "numeric_anomaly_candidate" in df.columns:
            df = df[df["numeric_anomaly_candidate"] < 0.9]

        monthly_df = self._aggregate_monthly(df, date_col)

        result = self._forecast_series(monthly_df, metric)

        self.cache.set(upload_id, cache_key, result)

        return result

    # ======================================================
    # GST FEATURE DERIVATION
    # ======================================================

    def _derive_gst_features(self, df: pd.DataFrame) -> pd.DataFrame:

        df = df.copy()

        slab_col = "gst_slab_effective"

        df[slab_col] = pd.to_numeric(df[slab_col], errors="coerce")
        df["gst_rate"] = df[slab_col] / 100.0
        df["gst_liability"] = df["amount"] * df["gst_rate"]

        df["itc_eligible_flag"] = df[slab_col].isin(ITC_ELIGIBLE_SLABS)
        df["itc_eligible_amount"] = np.where(
            df["itc_eligible_flag"], df["amount"], 0.0
        )

        return df

    # ======================================================
    # MONTHLY AGGREGATION
    # ======================================================

    def _aggregate_monthly(
        self,
        df: pd.DataFrame,
        date_col: str
    ) -> pd.DataFrame:

        df["_month"] = df[date_col].dt.to_period("M").dt.to_timestamp()

        monthly = (
            df.groupby("_month")
            .agg(
                total_expenses=("amount", "sum"),
                gst_liability=("gst_liability", "sum"),
                itc_eligible_amount=("itc_eligible_amount", "sum"),
                txn_count=("amount", "size"),
            )
            .reset_index()
            .rename(columns={"_month": "month"})
            .sort_values("month")
        )

        return monthly

    # ======================================================
    # FORECAST DRIVER
    # ======================================================

    def _forecast_series(
        self,
        monthly_df: pd.DataFrame,
        value_col: str
    ) -> Dict[str, Any]:

        if value_col not in monthly_df.columns:
            raise ValueError(f"Invalid metric: {value_col}")

        series = monthly_df.set_index("month")[value_col].dropna()
        n_points = len(series)

        model_choice = choose_model(n_points)

        if model_choice.model_type == "none":
            return {HISTORY_KEY: [], FORECAST_KEY: [], META_KEY: {}}

        history_records = [
            {"month": m.strftime("%Y-%m-01"), "value": float(v)}
            for m, v in series.items()
        ]

        horizon = model_choice.horizon_months
        warnings_list = list(model_choice.warnings)

        try:
            if model_choice.model_type == "prophet":
                forecast_df = self._prophet_forecast(series, horizon)
                final_model = "prophet"
            elif model_choice.model_type == "arima":
                forecast_df = self._arima_forecast(series, horizon)
                final_model = "arima"
            else:
                forecast_df = self._baseline_forecast(series, horizon)
                final_model = forecast_df["model_used"].iloc[0]
        except Exception as e:
            warnings_list.append(
                f"Primary model failed ({type(e).__name__}); fallback triggered."
            )
            try:
                forecast_df = self._arima_forecast(series, horizon)
                final_model = "arima"
            except Exception:
                forecast_df = self._baseline_forecast(series, horizon)
                final_model = forecast_df["model_used"].iloc[0]

        forecast_records = [
            {
                "month": pd.to_datetime(row["month"]).strftime("%Y-%m-01"),
                "yhat": float(row["yhat"]),
                "yhat_lower": float(row["yhat_lower"]),
                "yhat_upper": float(row["yhat_upper"]),
                "model_used": row["model_used"],
            }
            for _, row in forecast_df.iterrows()
        ]

        return {
            HISTORY_KEY: history_records,
            FORECAST_KEY: forecast_records,
            META_KEY: {
                "model_used": final_model,
                "reason": model_choice.reason,
                "warnings": warnings_list,
                "n_points": n_points,
                "horizon_months": horizon,
                "value_col": value_col,
            },
        }

    # ======================================================
    # MODEL IMPLEMENTATIONS
    # ======================================================

    def _baseline_forecast(self, series, horizon):

        last_month = series.index[-1]
        future_idx = [
            last_month + relativedelta(months=i)
            for i in range(1, horizon + 1)
        ]

        level = series.mean() if len(series) >= 2 else series.iloc[-1]
        std = series.std(ddof=1)
        if np.isnan(std) or std == 0:
            std = abs(level) * 0.15

        forecast_vals = np.full(horizon, level)

        return pd.DataFrame({
            "month": future_idx,
            "yhat": forecast_vals,
            "yhat_lower": forecast_vals - 1.96 * std,
            "yhat_upper": forecast_vals + 1.96 * std,
            "model_used": "baseline",
        })

    def _arima_forecast(self, series, horizon):

        model = SARIMAX(
            series,
            order=(1, 0, 0),
            seasonal_order=(0, 0, 0, 0),
            enforce_stationarity=False,
            enforce_invertibility=False,
        )

        res = model.fit(disp=False)
        pred = res.get_forecast(steps=horizon)

        future_idx = [
            series.index[-1] + relativedelta(months=i)
            for i in range(1, horizon + 1)
        ]

        conf_int = pred.conf_int()

        return pd.DataFrame({
            "month": future_idx,
            "yhat": pred.predicted_mean.values,
            "yhat_lower": conf_int.iloc[:, 0].values,
            "yhat_upper": conf_int.iloc[:, 1].values,
            "model_used": "arima",
        })

    def _prophet_forecast(self, series, horizon):

        if not PROPHET_AVAILABLE:
            raise RuntimeError("Prophet not installed.")

        df_prophet = pd.DataFrame({
            "ds": series.index,
            "y": series.values,
        })

        m = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,
        )

        m.fit(df_prophet)

        future = m.make_future_dataframe(periods=horizon, freq="MS")
        forecast = m.predict(future)

        forecast_future = forecast[
            forecast["ds"] > series.index[-1]
        ].head(horizon)

        return pd.DataFrame({
            "month": forecast_future["ds"].values,
            "yhat": forecast_future["yhat"].values,
            "yhat_lower": forecast_future["yhat_lower"].values,
            "yhat_upper": forecast_future["yhat_upper"].values,
            "model_used": "prophet",
        })