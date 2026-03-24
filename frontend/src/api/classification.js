import axios from 'axios';

const CLASSIFICATION_URL = import.meta.env.VITE_CLASSIFICATION_URL || 'http://localhost:8001';

// Direct calls to the classification service (no proxy needed in production)
export const uploadCSV = async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${CLASSIFICATION_URL}/classify/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
    });
    return res.data;
};

export const getClassificationStatus = async (uploadId) => {
    const res = await axios.get(`${CLASSIFICATION_URL}/classify/status/${uploadId}`);
    return res.data;
};
