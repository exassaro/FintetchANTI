import axios from 'axios';

// All analytics calls go through /api/* — Vite proxy strips the prefix
// and forwards to the analytics service

// ── Dashboard ──────────────────────────────────────────────
export const getDashboardSummary = (uploadId) =>
    axios.get(`/api/dashboard/${uploadId}/summary`).then(r => r.data);

export const getSlabDistribution = (uploadId) =>
    axios.get(`/api/dashboard/${uploadId}/slabs`).then(r => r.data);

export const getSlabWiseSpend = (uploadId) =>
    axios.get(`/api/dashboard/${uploadId}/slab-spend`).then(r => r.data);

export const getAnomalyStatistics = (uploadId) =>
    axios.get(`/api/dashboard/${uploadId}/anomalies`).then(r => r.data);

export const getMonthlyTrends = (uploadId) =>
    axios.get(`/api/dashboard/${uploadId}/monthly`).then(r => r.data);

// ── KPIs ───────────────────────────────────────────────────
export const getFinancialKPIs = (uploadId) =>
    axios.get(`/api/kpi/${uploadId}/financial`).then(r => r.data);

export const getComplianceKPIs = (uploadId) =>
    axios.get(`/api/kpi/${uploadId}/compliance`).then(r => r.data);

export const exportSummaryCSV = (uploadId) => {
    window.open(`/api/kpi/${uploadId}/export`, '_blank');
};

// ── Forecast ───────────────────────────────────────────────
export const getForecast = (uploadId, metric = 'total_expenses', excludeAnomalies = true) =>
    axios.get(`/api/forecast/${uploadId}`, {
        params: { metric, exclude_anomalies: excludeAnomalies },
    }).then(r => r.data);

// ── Time Series ────────────────────────────────────────────
export const getTimeSeries = (uploadId, metric = 'total_expenses') =>
    axios.get(`/api/time-series/${uploadId}`, { params: { metric } }).then(r => r.data);

// ── Distribution ───────────────────────────────────────────
export const getVendorDistribution = (uploadId, topN = 10) =>
    axios.get(`/api/distribution/${uploadId}/vendors`, { params: { top_n: topN } }).then(r => r.data);

export const getCategoryDistribution = (uploadId, topN = 10) =>
    axios.get(`/api/distribution/${uploadId}/categories`, { params: { top_n: topN } }).then(r => r.data);

// ── Review ─────────────────────────────────────────────────
const reviewQueueCache = {};

export const clearReviewQueueCache = (uploadId) => {
    Object.keys(reviewQueueCache).forEach(k => {
        if (k.startsWith(`${uploadId}_`)) delete reviewQueueCache[k];
    });
};

export const getReviewQueue = (uploadId, filterType = null) => {
    const key = `${uploadId}_${filterType || 'all'}`;
    if (reviewQueueCache[key]) return Promise.resolve(reviewQueueCache[key]);

    return axios.get(`/api/review/${uploadId}/queue`, {
        params: filterType ? { filter_type: filterType } : {},
    }).then(r => {
        reviewQueueCache[key] = r.data;
        return r.data;
    });
};

export const submitReviewDecision = (uploadId, payload) =>
    axios.post(`/api/review/${uploadId}/decision`, payload).then(r => r.data);

// ── Chatbot ────────────────────────────────────────────────
export const sendChatbotQuery = (uploadId, query, rowIndex = null) =>
    axios.post('/api/chatbot/query', {
        upload_id: uploadId,
        query,
        ...(rowIndex !== null ? { row_index: rowIndex } : {}),
    }).then(r => r.data);

// ── News ───────────────────────────────────────────────────
export const getFinancialNews = () =>
    axios.get('/api/news/').then(r => r.data);
