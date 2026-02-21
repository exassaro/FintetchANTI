import os
import uuid
from datetime import datetime


def generate_filename(
    original_name: str,
    schema: str,
    upload_id: uuid.UUID,
    stage: str
) -> str:
    """
    Generate readable, traceable filename.

    stage: "raw" or "classified"
    """

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    base_name = os.path.splitext(original_name)[0]
    base_name = base_name.replace(" ", "_")

    # Optional: remove special characters
    base_name = "".join(
        c for c in base_name if c.isalnum() or c in ("_", "-")
    )

    short_uuid = str(upload_id)[:8]

    return f"{timestamp}_{base_name}_{schema}_{short_uuid}_{stage}.csv"