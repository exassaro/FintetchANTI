import axios from 'axios';

const RETRAINING_URL = import.meta.env.VITE_RETRAINING_URL || 'http://localhost:8005';

// ── Trigger ────────────────────────────────────────────────
export const triggerRetraining = (schemaType, triggeredBy = 'manual') =>
    axios.post(`${RETRAINING_URL}/retraining/trigger`, {
        schema_type: schemaType,
        triggered_by: triggeredBy,
    }).then(r => r.data);

// ── Job Status ─────────────────────────────────────────────
export const getRetrainingJobStatus = (jobId) =>
    axios.get(`${RETRAINING_URL}/retraining/status/${jobId}`).then(r => r.data);

// ── Job History ────────────────────────────────────────────
export const getRetrainingJobs = (schemaType = null, limit = 50) =>
    axios.get(`${RETRAINING_URL}/retraining/jobs`, {
        params: {
            ...(schemaType ? { schema_type: schemaType } : {}),
            limit,
        },
    }).then(r => r.data);

// ── Health ─────────────────────────────────────────────────
export const getRetrainingHealth = () =>
    axios.get(`${RETRAINING_URL}/health`).then(r => r.data);
