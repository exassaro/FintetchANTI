import axios from 'axios';

// ── Trigger ────────────────────────────────────────────────
export const triggerRetraining = (schemaType, triggeredBy = 'manual') =>
    axios.post('/api/retraining/trigger', {
        schema_type: schemaType,
        triggered_by: triggeredBy,
    }).then(r => r.data);

// ── Job Status ─────────────────────────────────────────────
export const getRetrainingJobStatus = (jobId) =>
    axios.get(`/api/retraining/status/${jobId}`).then(r => r.data);

// ── Job History ────────────────────────────────────────────
export const getRetrainingJobs = (schemaType = null, limit = 50) =>
    axios.get('/api/retraining/jobs', {
        params: {
            ...(schemaType ? { schema_type: schemaType } : {}),
            limit,
        },
    }).then(r => r.data);

// ── Health ─────────────────────────────────────────────────
export const getRetrainingHealth = () =>
    axios.get('/api/health').then(r => r.data);
