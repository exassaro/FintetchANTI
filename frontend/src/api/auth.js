import axios from 'axios';

const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8004';

// ── Login ──────────────────────────────────────────
export const loginUser = (email, password) =>
    axios.post(`${AUTH_URL}/auth/login`, { email, password }).then(r => r.data);

// ── Register (admin-only) ──────────────────────────
export const registerUser = (payload, token) =>
    axios.post(`${AUTH_URL}/auth/register`, payload, {
        headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.data);

// ── Get Current User ───────────────────────────────
export const getCurrentUser = (token) =>
    axios.get(`${AUTH_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.data);
