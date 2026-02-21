import axios from 'axios';

// With Vite proxy, /classify/* is forwarded to http://localhost:8001
export const uploadCSV = async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post('/classify/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
    });
    return res.data;
};

export const getClassificationStatus = async (uploadId) => {
    const res = await axios.get(`/classify/status/${uploadId}`);
    return res.data;
};
