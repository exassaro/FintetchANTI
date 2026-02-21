import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { usePipeline } from '../context/PipelineContext';

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
    const meta = PAGE_TITLES[location.pathname] || { title: 'GSTAnalytica', sub: '' };

    return (
        <div className="layout">
            <Sidebar />
            <div className="main-content">
                {/* Sticky top bar */}
                <div style={{
                    height: 50,
                    background: '#FFFFFF',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 30px',
                    flexShrink: 0,
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    {/* Breadcrumb */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: '0.69rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {meta.sub}
                        </span>
                        <span style={{ color: '#D1D5DB', fontSize: '0.8rem', lineHeight: 1 }}>›</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E293B' }}>
                            {meta.title}
                        </span>
                    </div>

                    {/* Right side indicators */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {uploadId && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '4px 10px',
                                background: '#F0FDF4',
                                border: '1px solid #A7F3D0',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                color: '#059669',
                                fontWeight: 600,
                                fontFamily: 'DM Mono, monospace',
                            }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 4px rgba(16,185,129,0.6)' }} />
                                ID: {uploadId.slice(0, 10)}…
                            </div>
                        )}
                        <div style={{
                            padding: '4px 11px',
                            background: '#F7FAF8',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            color: '#475569',
                            fontWeight: 500,
                        }}>
                            🇮🇳 India GST Platform
                        </div>
                    </div>
                </div>

                <Outlet />
            </div>
        </div>
    );
}
