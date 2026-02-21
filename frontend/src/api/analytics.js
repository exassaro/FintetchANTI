import axios from 'axios';

// All analytics calls use relative paths — Vite proxy forwards to http://localhost:8003

// ── Dashboard ──────────────────────────────────────────────
export const getDashboardSummary = (uploadId) =>
    axios.get(`/dashboard/${uploadId}/summary`).then(r => r.data);

export const getSlabDistribution = (uploadId) =>
    axios.get(`/dashboard/${uploadId}/slabs`).then(r => r.data);

export const getSlabWiseSpend = (uploadId) =>
    axios.get(`/dashboard/${uploadId}/slab-spend`).then(r => r.data);

export const getAnomalyStatistics = (uploadId) =>
    axios.get(`/dashboard/${uploadId}/anomalies`).then(r => r.data);

export const getMonthlyTrends = (uploadId) =>
    axios.get(`/dashboard/${uploadId}/monthly`).then(r => r.data);

// ── KPIs ───────────────────────────────────────────────────
export const getFinancialKPIs = (uploadId) =>
    axios.get(`/kpi/${uploadId}/financial`).then(r => r.data);

export const getComplianceKPIs = (uploadId) =>
    axios.get(`/kpi/${uploadId}/compliance`).then(r => r.data);

// ── Forecast ───────────────────────────────────────────────
export const getForecast = (uploadId, metric = 'total_expenses', excludeAnomalies = true) =>
    axios.get(`/forecast/${uploadId}`, {
        params: { metric, exclude_anomalies: excludeAnomalies },
    }).then(r => r.data);

// ── Time Series ────────────────────────────────────────────
export const getTimeSeries = (uploadId, metric = 'total_expenses') =>
    axios.get(`/time-series/${uploadId}`, { params: { metric } }).then(r => r.data);

// ── Distribution ───────────────────────────────────────────
export const getVendorDistribution = (uploadId, topN = 10) =>
    axios.get(`/distribution/${uploadId}/vendors`, { params: { top_n: topN } }).then(r => r.data);

export const getCategoryDistribution = (uploadId, topN = 10) =>
    axios.get(`/distribution/${uploadId}/categories`, { params: { top_n: topN } }).then(r => r.data);

// ── Review ─────────────────────────────────────────────────
export const getReviewQueue = (uploadId, filterType = null) =>
    axios.get(`/review/${uploadId}/queue`, {
        params: filterType ? { filter_type: filterType } : {},
    }).then(r => r.data);

export const submitReviewDecision = (uploadId, payload) =>
    axios.post(`/review/${uploadId}/decision`, payload).then(r => r.data);

// ── Chatbot ────────────────────────────────────────────────
export const sendChatbotQuery = (uploadId, query, rowIndex = null) =>
    axios.post('/chatbot/query', {
        upload_id: uploadId,
        query,
        ...(rowIndex !== null ? { row_index: rowIndex } : {}),
    }).then(r => r.data);
