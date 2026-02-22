import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { usePipeline } from '../context/PipelineContext';
import { useAuth } from '../context/AuthContext';
import {
    AppBar, Toolbar, Typography, Chip, Button, Avatar,
    Tooltip, Divider, Box, Fade
} from '@mui/material';
import { LogOut, User, Zap } from 'lucide-react';

const PAGE_TITLES = {
    '/': { title: 'Upload & Process', sub: 'Pipeline' },
    '/dashboard': { title: 'Dashboard', sub: 'Analytics' },
    '/kpi': { title: 'KPI Reports', sub: 'Analytics' },
    '/time-series': { title: 'Time Series', sub: 'Analytics' },
    '/forecast': { title: 'Forecast', sub: 'Analytics' },
    '/distribution': { title: 'Distribution', sub: 'Analytics' },
    '/review': { title: 'Review Queue', sub: 'Compliance' },
    '/chatbot': { title: 'AI Chatbot', sub: 'AI Assistant' },
};

export default function Layout() {
    const location = useLocation();
    const { uploadId } = usePipeline();
    const { user, logout } = useAuth();
    const meta = PAGE_TITLES[location.pathname] || { title: 'Auditron', sub: '' };

    return (
        <div className="layout">
            <Sidebar />
            <div className="main-content">
                {/* Enhanced top bar with MUI */}
                <AppBar
                    position="sticky"
                    elevation={0}
                    sx={{
                        background: '#FFFFFF',
                        borderBottom: '1px solid #E2E8F0',
                        color: '#1E293B',
                        zIndex: 50,
                    }}
                >
                    <Toolbar variant="dense" sx={{ minHeight: 52, px: '30px !important', justifyContent: 'space-between' }}>
                        {/* Breadcrumb */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 700, textTransform: 'uppercase',
                                    letterSpacing: '0.08em', color: '#94A3B8', fontSize: '0.69rem',
                                }}
                            >
                                {meta.sub}
                            </Typography>
                            <Typography sx={{ color: '#D1D5DB', fontSize: '0.8rem', lineHeight: 1, mx: 0.3 }}>›</Typography>
                            <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 650, color: '#1E293B', fontSize: '0.875rem' }}
                            >
                                {meta.title}
                            </Typography>
                        </Box>

                        {/* Right side */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {uploadId && (
                                <Fade in>
                                    <Tooltip title={`Active Upload: ${uploadId}`} arrow placement="bottom">
                                        <Chip
                                            size="small"
                                            icon={
                                                <Box sx={{
                                                    width: 7, height: 7, borderRadius: '50%',
                                                    background: '#10B981',
                                                    boxShadow: '0 0 6px rgba(16,185,129,0.7)',
                                                    ml: 0.5,
                                                }} />
                                            }
                                            label={`ID: ${uploadId.slice(0, 10)}…`}
                                            sx={{
                                                background: '#F0FDF4',
                                                border: '1px solid #A7F3D0',
                                                color: '#059669',
                                                fontWeight: 600,
                                                fontFamily: 'DM Mono, monospace',
                                                fontSize: '0.7rem',
                                                height: 26,
                                            }}
                                        />
                                    </Tooltip>
                                </Fade>
                            )}

                            {user && (
                                <Tooltip title={`${user.username}${user.is_admin ? ' (Administrator)' : ''}`} arrow placement="bottom">
                                    <Chip
                                        size="small"
                                        avatar={
                                            <Avatar sx={{
                                                width: 22, height: 22,
                                                background: 'linear-gradient(135deg, #059669, #10B981)',
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                            }}>
                                                {user.username?.charAt(0).toUpperCase()}
                                            </Avatar>
                                        }
                                        label={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {user.username}
                                                {user.is_admin && (
                                                    <Chip
                                                        label="ADMIN"
                                                        size="small"
                                                        sx={{
                                                            height: 16, fontSize: '0.55rem',
                                                            fontWeight: 800,
                                                            background: '#EEF2FF', color: '#6366F1',
                                                            '& .MuiChip-label': { px: 0.6 },
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        }
                                        sx={{
                                            background: '#F7FAF8',
                                            border: '1px solid #E2E8F0',
                                            color: '#475569',
                                            fontWeight: 500,
                                            fontSize: '0.78rem',
                                            height: 30,
                                        }}
                                    />
                                </Tooltip>
                            )}

                            <Tooltip title="Sign out of your account" arrow placement="bottom">
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={logout}
                                    startIcon={<LogOut size={13} />}
                                    sx={{
                                        borderColor: '#E2E8F0',
                                        color: '#94A3B8',
                                        fontWeight: 500,
                                        fontSize: '0.75rem',
                                        textTransform: 'none',
                                        minWidth: 'auto',
                                        px: 1.5, py: 0.4,
                                        '&:hover': {
                                            borderColor: '#F43F5E',
                                            color: '#F43F5E',
                                            background: '#FFF1F2',
                                        },
                                    }}
                                >
                                    Sign Out
                                </Button>
                            </Tooltip>
                        </Box>
                    </Toolbar>
                </AppBar>

                <Outlet />
            </div>
        </div>
    );
}
