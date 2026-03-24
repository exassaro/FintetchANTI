import axios from 'axios';

const ANALYTICS_URL = import.meta.env.VITE_ANALYTICS_URL || 'http://localhost:8003';

// ── Dashboard ──────────────────────────────────────────────
export const getDashboardSummary = (uploadId) =>
    axios.get(`${ANALYTICS_URL}/dashboard/${uploadId}/summary`).then(r => r.data);

export const getSlabDistribution = (uploadId) =>
    axios.get(`${ANALYTICS_URL}/dashboard/${uploadId}/slabs`).then(r => r.data);

export const getSlabWiseSpend = (uploadId) =>
    axios.get(`${ANALYTICS_URL}/dashboard/${uploadId}/slab-spend`).then(r => r.data);

export const getAnomalyStatistics = (uploadId) =>
    axios.get(`${ANALYTICS_URL}/dashboard/${uploadId}/anomalies`).then(r => r.data);

export const getMonthlyTrends = (uploadId) =>
    axios.get(`${ANALYTICS_URL}/dashboard/${uploadId}/monthly`).then(r => r.data);

// ── KPIs ───────────────────────────────────────────────────
export const getFinancialKPIs = (uploadId) =>
    axios.get(`${ANALYTICS_URL}/kpi/${uploadId}/financial`).then(r => r.data);

export const getComplianceKPIs = (uploadId) =>
    axios.get(`${ANALYTICS_URL}/kpi/${uploadId}/compliance`).then(r => r.data);

export const exportSummaryCSV = (uploadId) => {
    window.open(`${ANALYTICS_URL}/kpi/${uploadId}/export`, '_blank');
};

// ── Forecast ───────────────────────────────────────────────
export const getForecast = (uploadId, metric = 'total_expenses', excludeAnomalies = true) =>
    axios.get(`${ANALYTICS_URL}/forecast/${uploadId}`, {
        params: { metric, exclude_anomalies: excludeAnomalies },
    }).then(r => r.data);

// ── Time Series ────────────────────────────────────────────
export const getTimeSeries = (uploadId, metric = 'total_expenses') =>
    axios.get(`${ANALYTICS_URL}/time-series/${uploadId}`, { params: { metric } }).then(r => r.data);

// ── Distribution ───────────────────────────────────────────
export const getVendorDistribution = (uploadId, topN = 10) =>
    axios.get(`${ANALYTICS_URL}/distribution/${uploadId}/vendors`, { params: { top_n: topN } }).then(r => r.data);

export const getCategoryDistribution = (uploadId, topN = 10) =>
    axios.get(`${ANALYTICS_URL}/distribution/${uploadId}/categories`, { params: { top_n: topN } }).then(r => r.data);

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

    return axios.get(`${ANALYTICS_URL}/review/${uploadId}/queue`, {
        params: filterType ? { filter_type: filterType } : {},
    }).then(r => {
        reviewQueueCache[key] = r.data;
        return r.data;
    });
};

export const submitReviewDecision = (uploadId, payload) =>
    axios.post(`${ANALYTICS_URL}/review/${uploadId}/decision`, payload).then(r => r.data);

// ── Chatbot ────────────────────────────────────────────────
export const sendChatbotQuery = (uploadId, query, rowIndex = null) =>
    axios.post(`${ANALYTICS_URL}/chatbot/query`, {
        upload_id: uploadId,
        query,
        ...(rowIndex !== null ? { row_index: rowIndex } : {}),
    }).then(r => r.data);

// ── News ───────────────────────────────────────────────────
export const getFinancialNews = () =>
    axios.get(`${ANALYTICS_URL}/news/`).then(r => r.data);
