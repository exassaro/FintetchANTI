import axios from 'axios';

// With Vite proxy, /anomaly/* is forwarded to http://localhost:8002
export const runAnomalyDetection = async (uploadId) => {
    const res = await axios.post(`/anomaly/run/${uploadId}`);
    return res.data;
};

export const getAnomalyHealth = async () => {
    const res = await axios.get('/anomaly/health');
    return res.data;
};
