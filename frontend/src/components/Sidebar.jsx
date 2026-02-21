import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    UploadCloud, LayoutDashboard, TrendingUp, BarChart2,
    Shield, MessageSquare, Eye, Activity, ChevronRight, Zap
} from 'lucide-react';
import { usePipeline } from '../context/PipelineContext';

const navItems = [
    {
        section: 'Pipeline',
        items: [
            { to: '/', icon: UploadCloud, label: 'Upload & Process', always: true },
        ]
    },
    {
        section: 'Analytics',
        items: [
            { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', requiresStage: 'detected' },
            { to: '/kpi', icon: Zap, label: 'KPI Reports', requiresStage: 'detected' },
            { to: '/time-series', icon: Activity, label: 'Time Series', requiresStage: 'detected' },
            { to: '/forecast', icon: TrendingUp, label: 'Forecast', requiresStage: 'detected' },
            { to: '/distribution', icon: BarChart2, label: 'Distribution', requiresStage: 'detected' },
        ]
    },
    {
        section: 'Review & AI',
        items: [
            { to: '/review', icon: Eye, label: 'Review Queue', requiresStage: 'detected' },
            { to: '/chatbot', icon: MessageSquare, label: 'AI Chatbot', requiresStage: 'detected' },
        ]
    }
];

const STAGE_ORDER = ['idle', 'uploading', 'classifying', 'classified', 'detecting', 'detected', 'analytics'];

const stageReached = (current, required) => {
    return STAGE_ORDER.indexOf(current) >= STAGE_ORDER.indexOf(required);
};

export default function Sidebar() {
    const { pipelineStage, uploadId, classificationResult, anomalyResult } = usePipeline();

    const steps = [
        { label: 'Upload CSV', stage: 'uploading' },
        { label: 'Classify', stage: 'classified' },
        { label: 'Anomaly Detect', stage: 'detected' },
    ];

    const getDotClass = (step) => {
        if (stageReached(pipelineStage, step.stage)) return 'done';
        if (pipelineStage === step.stage || pipelineStage === 'classifying' && step.stage === 'classified') return 'active';
        if (pipelineStage === 'detecting' && step.stage === 'detected') return 'active';
        return 'idle';
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-mark">
                    <div className="logo-icon">🇮🇳</div>
                    <div className="logo-text">
                        <span className="logo-name">GSTAnalytica</span>
                        <span className="logo-tagline">SME Audit Platform</span>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(section => (
                    <div key={section.section}>
                        <div className="nav-section-label">{section.section}</div>
                        {section.items.map(item => {
                            const isDisabled = item.requiresStage && !stageReached(pipelineStage, item.requiresStage);
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === '/'}
                                    className={({ isActive }) =>
                                        `nav-item${isActive ? ' active' : ''}${isDisabled ? ' disabled' : ''}`
                                    }
                                    onClick={e => isDisabled && e.preventDefault()}
                                >
                                    <Icon className="nav-icon" size={17} />
                                    {item.label}
                                    {isDisabled && (
                                        <span className="sidebar-badge badge-pending">Pending</span>
                                    )}
                                    {!isDisabled && stageReached(pipelineStage, 'detected') && item.requiresStage && (
                                        <span className="sidebar-badge badge-ready">Ready</span>
                                    )}
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="pipeline-status">
                    <div className="pipeline-status-title">Pipeline Status</div>
                    <div className="pipeline-steps">
                        {steps.map((step) => (
                            <div key={step.stage} className="pipeline-step">
                                <div className={`step-dot ${getDotClass(step)}`} />
                                <span style={{ color: getDotClass(step) === 'done' ? '#059669' : getDotClass(step) === 'active' ? '#3B82F6' : 'var(--text-muted)', fontSize: '0.78rem' }}>
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>
                    {uploadId && (
                        <div style={{ marginTop: 10, fontSize: '0.65rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                            ID: {uploadId.slice(0, 8)}…
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
