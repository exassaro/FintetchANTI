import axios from 'axios';

// With Vite proxy, /api/anomaly/* is forwarded to the anomaly service (prefix stripped)
export const runAnomalyDetection = async (uploadId) => {
    const res = await axios.post(`/api/anomaly/run/${uploadId}`);
    return res.data;
};

export const getAnomalyHealth = async () => {
    const res = await axios.get('/api/anomaly/health');
    return res.data;
};
