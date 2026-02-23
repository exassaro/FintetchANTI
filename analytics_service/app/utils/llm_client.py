# app/utils/llm_client.py

import os
from typing import Tuple, Dict, Any
from groq import Groq

# The user's provided API key is set here as a fallback if not in env vars
_GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "SECRET_REPLACED_OLD_GROQ_KEY")

client = Groq(api_key=_GROQ_API_KEY)

def call_llm(context_payload: Dict[str, Any]) -> Tuple[str, str]:
    """
    Calls the Groq LLM provider to explain an anomaly or answer a general query.
    Returns explanation text and model name.
    """
    model_name = "llama-3.3-70b-versatile"  # Groq's fast Llama 3 model

    # Case 1: General Query Fallback or Data Formatting
    if "query" in context_payload:
        data_context = context_payload.get("data", "")
        prompt = f"""
        You are an Indian GST financial audit assistant.
        Respond in a natural, helpful, and conversational tone, like a professional accountant.
        
        CRITICAL FORMATTING INSTRUCTIONS:
        - NEVER USE MARKDOWN. Absolutely do NOT use asterisks (*) for lists, bolding (**), or italics (*).
        - DO NOT use hash symbols (#) for headers or plus signs (+) for lists.
        - ALWAYS use standard numbers (1., 2., 3.) or standard dashes (-) for lists.
        - ALWAYS separate your points with clear, readable paragraph breaks. 
        - DO NOT use bold text formatting of any kind. If you need to emphasize a word, use ALL CAPS.
        - Provide thorough, naturally flowing, helpful answers instead of being robotic.
        - If 'System Data Context' is provided below, gracefully incorporate that data to answer the user's question completely.

        User Query: {context_payload['query']}
        """

        if data_context:
            prompt += f"\nSystem Data Context: {data_context}\n"

    # Case 2: Specific Row Explanation
    else:
        prompt = f"""
        You are an elite financial audit assistant.

        Analyze the following transaction:

        Transaction ID: {context_payload.get('transaction_id')}
        Description: {context_payload.get('description')}
        Amount: {context_payload.get('amount')}
        GST Slab: {context_payload.get('gst_slab')}
        Confidence: {context_payload.get('gst_confidence')}
        Confidence Margin: {context_payload.get('gst_confidence_margin')}
        Anomaly Score: {context_payload.get('anomaly_score')}
        Anomaly Reasons: {context_payload.get('anomaly_reasons')}
        Is Anomaly: {context_payload.get('is_anomaly')}

        Explain clearly and professionally why this transaction was highlighted.
        If it's an anomaly, explain why it was flagged as anomalous.
        If it has low GST confidence, explain why the GST slab is ambiguous for this vendor/category.
        Specifically mention what a human reviewer should verify.

        Keep your explanation EXTREMELY CONCISE (maximum 2-3 short sentences). Get straight to the point.
        
        CRITICAL FORMATTING INSTRUCTIONS:
        - NEVER USE MARKDOWN. Do not use asterisks (*) for lists or bolding.
        - ALWAYS use standard numbers (1., 2.) or pure dashes (-).
        - DO NOT use bolding or italics. Use ALL CAPS for emphasis if needed.
        - Please use clear paragraph breaks. Keep your explanation naturally flowing but professional.
        - Do not recompute the anomaly score or change the classification.
        """

    try:
        response = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful financial analytics AI assistant."
                },
                {
                    "role": "user",
                    "content": prompt.strip()
                }
            ],
            model=model_name,
            temperature=0.3,
            max_tokens=1000
        )
        explanation = response.choices[0].message.content.strip()
        model_used = response.model
    except Exception as e:
        explanation = f"Error generating explanation: {str(e)}"
        model_used = "error"

    return explanation, model_used