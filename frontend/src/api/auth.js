import axios from 'axios';

// ── Login ──────────────────────────────────────────
export const loginUser = (email, password) =>
    axios.post('/api/auth/login', { email, password }).then(r => r.data);

// ── Register (admin-only) ──────────────────────────
export const registerUser = (payload, token) =>
    axios.post('/api/auth/register', payload, {
        headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.data);

// ── Get Current User ───────────────────────────────
export const getCurrentUser = (token) =>
    axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.data);
