# app/utils/llm_client.py

from typing import Tuple, Dict, Any

# Replace with Gemini/OpenAI/etc.

def call_llm(context_payload: Dict[str, Any]) -> Tuple[str, str]:
    """
    This function calls your LLM provider.
    Returns explanation text and model name.
    """

    prompt = f"""
You are a financial audit assistant.

Analyze the following transaction:

Transaction ID: {context_payload['transaction_id']}
Description: {context_payload['description']}
Amount: {context_payload['amount']}
GST Slab: {context_payload['gst_slab']}
Confidence: {context_payload['gst_confidence']}
Confidence Margin: {context_payload['gst_confidence_margin']}
Anomaly Score: {context_payload['anomaly_score']}
Anomaly Reasons: {context_payload['anomaly_reasons']}
Is Anomaly: {context_payload['is_anomaly']}

Explain clearly why this transaction was flagged and what a reviewer should verify.
Do not recompute anomaly score.
Do not change classification.
Provide business reasoning only.
"""

    # Replace this mock with real API call
    explanation = "This transaction was flagged due to low confidence and anomaly score pattern."
    model_used = "mock-llm"

    return explanation.strip(), model_used