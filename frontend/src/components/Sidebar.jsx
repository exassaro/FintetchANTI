import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    UploadCloud, LayoutDashboard, TrendingUp, BarChart2,
    MessageSquare, Eye, Activity, Zap, Bot, Globe
} from 'lucide-react';
import logoUrl from '../assets/logo.svg';
import { usePipeline } from '../context/PipelineContext';
import { Tooltip, Chip, Box, Typography, LinearProgress, Fade } from '@mui/material';

const navItems = [
    {
        section: 'Pipeline',
        items: [
            { to: '/', icon: UploadCloud, label: 'Upload & Process', always: true },
            { to: '/news', icon: Globe, label: 'Live News', always: true },
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
            { to: '/chatbot', icon: Bot, label: 'AI Chatbot', requiresStage: 'detected' },
        ]
    }
];

const STAGE_ORDER = ['idle', 'uploading', 'classifying', 'classified', 'detecting', 'detected', 'analytics'];

const stageReached = (current, required) => {
    return STAGE_ORDER.indexOf(current) >= STAGE_ORDER.indexOf(required);
};

export default function Sidebar() {
    const { pipelineStage, uploadId } = usePipeline();

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

    // Calculate pipeline progress percentage
    const completedSteps = steps.filter(s => getDotClass(s) === 'done').length;
    const progressPercent = (completedSteps / steps.length) * 100;

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-mark">
                    <div className="logo-icon"><img src={logoUrl} alt="Logo" style={{ width: 50, height: 50, objectFit: 'contain' }} /></div>
                    <div className="logo-text">
                        <span className="logo-name">Auditron</span>
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
                            const navContent = (
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
                                        <Chip
                                            label="Pending"
                                            size="small"
                                            sx={{
                                                ml: 'auto', height: 20, fontSize: '0.58rem',
                                                fontWeight: 700, letterSpacing: '0.05em',
                                                background: 'var(--accent-amber-lt)', color: 'var(--text-primary)',
                                                border: '1px solid var(--accent-amber-border)',
                                                '& .MuiChip-label': { px: 0.7 },
                                            }}
                                        />
                                    )}
                                    {!isDisabled && stageReached(pipelineStage, 'detected') && item.requiresStage && (
                                        <Chip
                                            label="Ready"
                                            size="small"
                                            sx={{
                                                ml: 'auto', height: 20, fontSize: '0.58rem',
                                                fontWeight: 700, letterSpacing: '0.05em',
                                                background: 'var(--accent-green-lt)', color: 'var(--text-primary)',
                                                border: '1px solid var(--accent-green-border)',
                                                '& .MuiChip-label': { px: 0.7 },
                                            }}
                                        />
                                    )}
                                </NavLink>
                            );

                            return isDisabled ? (
                                <Tooltip key={item.to} title="Upload & process a CSV first" arrow placement="right">
                                    <span>{navContent}</span>
                                </Tooltip>
                            ) : (
                                <React.Fragment key={item.to}>{navContent}</React.Fragment>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="pipeline-status">
                    <div className="pipeline-status-title">Pipeline Status</div>

                    {/* Progress bar */}
                    <Box sx={{ mb: 1.2 }}>
                        <LinearProgress
                            variant="determinate"
                            value={progressPercent}
                            sx={{
                                height: 5, borderRadius: 3,
                                backgroundColor: 'var(--border)',
                                '& .MuiLinearProgress-bar': {
                                    background: progressPercent === 100
                                        ? 'linear-gradient(90deg, #059669, #10B981)'
                                        : 'linear-gradient(90deg, #3B82F6, #6366F1)',
                                    borderRadius: 3,
                                },
                            }}
                        />
                        <Typography variant="caption" sx={{ mt: 0.3, display: 'block', textAlign: 'right', fontSize: '0.6rem' }}>
                            {completedSteps}/{steps.length} complete
                        </Typography>
                    </Box>

                    <div className="pipeline-steps">
                        {steps.map((step) => (
                            <div key={step.stage} className="pipeline-step">
                                <div className={`step-dot ${getDotClass(step)}`} />
                                <span style={{
                                    color: getDotClass(step) === 'done' ? 'var(--accent-green)'
                                        : getDotClass(step) === 'active' ? 'var(--accent-blue)'
                                            : 'var(--text-muted)',
                                    fontSize: '0.78rem',
                                    fontWeight: getDotClass(step) === 'done' ? 600 : 400,
                                }}>
                                    {step.label}
                                </span>
                                {getDotClass(step) === 'done' && (
                                    <Fade in><span style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>✓</span></Fade>
                                )}
                            </div>
                        ))}
                    </div>
                    {uploadId && (
                        <Tooltip title={uploadId} arrow placement="top">
                            <div style={{ marginTop: 10, fontSize: '0.65rem', color: 'var(--text-muted)', wordBreak: 'break-all', cursor: 'help' }}>
                                ID: {uploadId.slice(0, 8)}…
                            </div>
                        </Tooltip>
                    )}
                </div>
            </div>
        </aside>
    );
}
