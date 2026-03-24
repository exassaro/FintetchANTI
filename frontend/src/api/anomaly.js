import axios from 'axios';

const ANOMALY_URL = import.meta.env.VITE_ANOMALY_URL || 'http://localhost:8002';

// Direct calls to the anomaly detection service (no proxy needed in production)
export const runAnomalyDetection = async (uploadId) => {
    const res = await axios.post(`${ANOMALY_URL}/anomaly/run/${uploadId}`);
    return res.data;
};

export const getAnomalyHealth = async () => {
    const res = await axios.get(`${ANOMALY_URL}/anomaly/health`);
    return res.data;
};
