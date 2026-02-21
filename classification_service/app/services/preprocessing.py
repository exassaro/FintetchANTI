import re
import numpy as np
import pandas as pd


# ==========================================================
# TEXT CLEANING UTILITIES
# ==========================================================

def clean_text_series(s: pd.Series) -> pd.Series:
    s = s.fillna("").astype(str)
    s = s.str.strip().str.lower()
    s = s.apply(lambda x: re.sub(r"[^0-9a-zA-Z\s]", " ", x))
    s = s.apply(lambda x: re.sub(r"\s+", " ", x).strip())
    return s


def is_effectively_nonempty_text(s: pd.Series) -> pd.Series:
    return s.fillna("").astype(str).str.strip().ne("")


# ==========================================================
# MAIN PREPROCESS FUNCTION
# ==========================================================

def preprocess(df: pd.DataFrame, schema_type: str) -> pd.DataFrame:
    """
    Common preprocessing pipeline for all schemas (A–E, H).

    - Cleans text fields
    - Engineers numeric + text features
    - Validates feature contract
    - Returns fully enriched dataframe
    """

    df = df.copy()
    original_columns = list(df.columns)

    columns = set(df.columns)

    has_description = "description" in columns
    has_vendor = "vendor_name" in columns
    has_category = "category" in columns
    has_amount = "amount" in columns
    has_date = "transaction_date" in columns

    # ------------------------------------------------------
    # REQUIRED CONTRACT VALIDATION
    # ------------------------------------------------------

    if not has_amount:
        raise ValueError("Required column 'amount' missing")

    # ------------------------------------------------------
    # CLEANING
    # ------------------------------------------------------

    if has_description:
        df["description"] = clean_text_series(df["description"])

    if has_vendor:
        df["vendor_name"] = clean_text_series(df["vendor_name"])

    if has_category:
        df["category"] = (
            df["category"]
            .fillna("unknown")
            .astype(str)
            .str.strip()
            .str.lower()
            .str.replace("_", " ", regex=False)
            .str.replace("-", " ", regex=False)
        )
        df["category"] = df["category"].apply(
            lambda x: re.sub(r"\s+", " ", x).strip()
        )

    # ------------------------------------------------------
    # AMOUNT CLEANING
    # ------------------------------------------------------

    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df = df[df["amount"].notna()]
    df = df[df["amount"] > 0]
    df.reset_index(drop=True, inplace=True)

    # ------------------------------------------------------
    # DATE FEATURE
    # ------------------------------------------------------

    month_col = None
    if has_date:
        df["transaction_date"] = pd.to_datetime(
            df["transaction_date"], errors="coerce", dayfirst=True
        )
        df["month"] = df["transaction_date"].dt.month
        month_col = "month"

    # ------------------------------------------------------
    # TEXT FEATURE ENGINEERING
    # ------------------------------------------------------

    desc_series = df["description"] if has_description else pd.Series([""] * len(df))
    vendor_series = df["vendor_name"] if has_vendor else pd.Series([""] * len(df))
    category_series = df["category"] if has_category else pd.Series([""] * len(df))

    desc_nonempty = is_effectively_nonempty_text(desc_series)
    vendor_nonempty = is_effectively_nonempty_text(vendor_series)
    category_nonempty = is_effectively_nonempty_text(category_series)

    # Combine available text columns
    text_input_raw = (
        desc_series.fillna("") + " "
        + vendor_series.fillna("") + " "
        + category_series.fillna("")
    ).str.strip()

    text_input_clean = clean_text_series(text_input_raw)

    df["text_input_raw"] = text_input_raw
    df["text_input_clean"] = text_input_clean
    df["text_len"] = text_input_clean.str.len().fillna(0).astype(int)

    # If no real text present
    if not (desc_nonempty.any() or vendor_nonempty.any() or category_nonempty.any()):
        df["text_input_raw"] = ""
        df["text_input_clean"] = ""
        df["text_len"] = 0

    # ------------------------------------------------------
    # NUMERIC FEATURES
    # ------------------------------------------------------

    df["log_amount"] = np.log1p(df["amount"])

    amount_mean = df["amount"].mean()
    amount_std = df["amount"].std(ddof=0)

    if amount_std == 0 or np.isnan(amount_std):
        df["amount_zscore"] = 0.0
    else:
        df["amount_zscore"] = (df["amount"] - amount_mean) / amount_std

    df["amount_percentile"] = df["amount"].rank(pct=True, method="average")

    if month_col:
        df["amount_month_interaction"] = df["log_amount"] * df[month_col]
    else:
        df["amount_month_interaction"] = np.nan

    # ------------------------------------------------------
    # CATEGORY FEATURES
    # ------------------------------------------------------

    if has_category:
        df["category_len"] = df["category"].str.len()
        df["category_present"] = category_nonempty
    else:
        df["category_len"] = 0
        df["category_present"] = False

    # ------------------------------------------------------
    # PRESENCE FLAGS
    # ------------------------------------------------------

    df["has_description"] = desc_nonempty if has_description else False
    df["has_vendor_name"] = vendor_nonempty if has_vendor else False
    df["has_category"] = category_nonempty if has_category else False

    df["schema_type"] = schema_type

    df["num_text_fields_present"] = (
        df["has_description"].astype(int)
        + df["has_vendor_name"].astype(int)
        + df["has_category"].astype(int)
    )

    # ------------------------------------------------------
    # VALIDATION CONTRACT
    # ------------------------------------------------------

    required_columns = [
        "amount",
        "log_amount",
        "amount_zscore",
        "amount_percentile",
        "amount_month_interaction",
        "text_input_raw",
        "text_input_clean",
        "text_len",
        "has_description",
        "has_vendor_name",
        "has_category",
        "schema_type",
        "num_text_fields_present",
        "category_len",
        "category_present",
    ]

    for col in required_columns:
        if col not in df.columns:
            raise ValueError(f"Required feature '{col}' missing after preprocessing")

    return df