def detect_schema(columns: set) -> str:
    """
    Detect dataset schema based on normalized column names.

    Expected canonical column names:
    transaction_id, transaction_date, amount, description,
    vendor_name, category, hsn_sac_code
    """

    # Required minimum contract
    if "amount" not in columns:
        raise ValueError("Required column 'amount' missing")

    # HSN schema takes priority
    if "hsn_sac_code" in columns:
        return "H"

    has_description = "description" in columns
    has_vendor = "vendor_name" in columns
    has_category = "category" in columns

    if has_description and has_vendor and has_category:
        return "A"

    if has_description and has_category and not has_vendor:
        return "B"

    if has_description and has_vendor and not has_category:
        return "C"

    if has_description and not has_vendor and not has_category:
        return "D"

    # Numeric-only schema
    return "E"