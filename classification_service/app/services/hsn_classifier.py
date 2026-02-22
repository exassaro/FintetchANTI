import json
import re
from typing import Dict, Any
import pandas as pd

from app.core.config import HSN_LOOKUP_PATH


class RulesConfigError(Exception):
    pass


class DataValidationError(Exception):
    pass


# ----------------------------------------------------------
# Lookup Loader (cached)
# ----------------------------------------------------------

_lookup_cache: Dict[str, Dict[str, Any]] | None = None


def _load_lookup() -> Dict[str, Dict[str, Any]]:
    global _lookup_cache

    if _lookup_cache is not None:
        return _lookup_cache

    try:
        with open(HSN_LOOKUP_PATH, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception as exc:
        raise RulesConfigError(f"Failed to load HSN/SAC lookup JSON: {exc}")

    if "HSN" not in raw or "SAC" not in raw:
        raise RulesConfigError("Lookup JSON must contain 'HSN' and 'SAC' sections")

    lookup = {"HSN": {}, "SAC": {}}

    for section in ("HSN", "SAC"):
        for entry in raw[section]:
            code = entry.get("code")
            if not code:
                raise RulesConfigError(f"Missing code in {section} entry")

            lookup[section][code] = {
                "gst_slab": entry["gst_slab"],
                "description": entry.get("description", ""),
            }

    _lookup_cache = lookup
    return lookup


# ----------------------------------------------------------
# Validation
# ----------------------------------------------------------

def _infer_code_type(code: str) -> str:
    code = code.strip()

    if code.startswith("99") and re.fullmatch(r"\d{4}|\d{6}", code):
        return "SAC"

    if re.fullmatch(r"\d{4}|\d{6}|\d{8}", code):
        return "HSN"

    raise DataValidationError(f"Invalid HSN/SAC format: {code}")


def _validate_dataframe(df: pd.DataFrame):
    required = {"transaction_id", "hsn_sac_code"}
    missing = required - set(df.columns)
    if missing:
        raise DataValidationError(f"Missing required columns: {sorted(missing)}")


# ----------------------------------------------------------
# Main Rule Engine
# ----------------------------------------------------------

def classify_hsn(df: pd.DataFrame) -> pd.DataFrame:
    """
    Deterministic HSN/SAC GST classification.

    Returns dataframe with:
        - gst_slab_predicted
        - gst_confidence
        - gst_confidence_margin
        - classification_source
        - rule_explanation
    """

    _validate_dataframe(df)
    lookup = _load_lookup()

    out = df.copy()

    out["gst_slab_predicted"] = None
    out["gst_confidence"] = 1.0
    out["gst_confidence_margin"] = 1.0
    out["classification_source"] = "HSN_RULE"
    out["rule_explanation"] = None

    for idx, row in out.iterrows():
        raw_code = row["hsn_sac_code"]

        if pd.isna(raw_code) or raw_code is None or str(raw_code).strip() == "" or str(raw_code).strip().lower() == "nan":
            out.at[idx, "gst_slab_predicted"] = None
            out.at[idx, "gst_confidence"] = 0.0
            out.at[idx, "rule_explanation"] = "Missing HSN/SAC code"
            continue

        code = str(raw_code).strip()
        if code.endswith(".0"):
            code = code[:-2]
        
        try:
            code_type = _infer_code_type(code)
        except DataValidationError as e:
            out.at[idx, "gst_slab_predicted"] = None
            out.at[idx, "gst_confidence"] = 0.0
            out.at[idx, "rule_explanation"] = str(e)
            continue

        rule = lookup.get(code_type, {}).get(code)
        if rule is None:
            out.at[idx, "gst_slab_predicted"] = None
            out.at[idx, "gst_confidence"] = 0.0
            out.at[idx, "rule_explanation"] = f"Unmapped {code_type} code '{code}'"
            continue

        gst_slab = rule["gst_slab"]

        out.at[idx, "gst_slab_predicted"] = gst_slab
        out.at[idx, "rule_explanation"] = (
            f"{code_type} {code} mapped to {gst_slab}% GST as per GST rate schedule"
        )

    return out