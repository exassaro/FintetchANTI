import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../api/auth';
import { clearPipelineSession } from './PipelineContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
    const [loading, setLoading] = useState(true);

    const login = (accessToken) => {
        localStorage.setItem('auth_token', accessToken);
        setToken(accessToken);
    };

    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        clearPipelineSession();          // wipe cached pipeline data on signout
        setToken(null);
        setUser(null);
    }, []);

    // On mount or token change, re-fetch user profile
    useEffect(() => {
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        getCurrentUser(token)
            .then(u => setUser(u))
            .catch(() => {
                // Token expired or invalid
                logout();
            })
            .finally(() => setLoading(false));
    }, [token, logout]);

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isAuthenticated: !!user,
            isAdmin: !!user?.is_admin,
            loading,
            login,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};
