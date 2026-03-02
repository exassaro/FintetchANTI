import React, { useEffect, useState, useCallback } from 'react';
import {
    RefreshCw, Play, CheckCircle, XCircle, Clock, Loader2,
    Zap, TrendingUp, Award, AlertTriangle, RotateCcw
} from 'lucide-react';
import { triggerRetraining, getRetrainingJobs } from '../api/retraining';
import {
    Button, Chip, Tooltip, Fade, Snackbar, Alert,
    Box, Typography, LinearProgress, Select, MenuItem,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';

const SCHEMAS = ['A', 'B', 'C', 'D'];

const STATUS_CONFIG = {
    completed: { color: '#059669', bg: 'var(--accent-green-lt)', border: 'var(--accent-green-border)', icon: CheckCircle, label: 'Completed' },
    running: { color: '#3B82F6', bg: '#EFF6FF', border: '#93C5FD', icon: Loader2, label: 'Running' },
    pending: { color: '#F59E0B', bg: 'var(--accent-amber-lt)', border: 'var(--accent-amber-border)', icon: Clock, label: 'Pending' },
    failed: { color: '#F43F5E', bg: 'var(--accent-rose-lt)', border: '#FDA4AF', icon: XCircle, label: 'Failed' },
};

const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export default function RetrainingPage() {
    const [jobs, setJobs] = useState([]);
    const [totalJobs, setTotalJobs] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filterSchema, setFilterSchema] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, msg: '', severity: 'success' });
    const [triggering, setTriggering] = useState(false);
    const [triggerTarget, setTriggerTarget] = useState('ALL');
    const [confirmOpen, setConfirmOpen] = useState(false);

    const showSnackbar = (msg, severity = 'success') => setSnackbar({ open: true, msg, severity });

    const loadJobs = useCallback(() => {
        setLoading(true);
        getRetrainingJobs(filterSchema || null, 50)
            .then(data => {
                setJobs(data.jobs || []);
                setTotalJobs(data.total || 0);
            })
            .catch(e => showSnackbar(e.response?.data?.detail || e.message, 'error'))
            .finally(() => setLoading(false));
    }, [filterSchema]);

    useEffect(() => { loadJobs(); }, [loadJobs]);

    // Auto-refresh every 10s if any job is running/pending
    useEffect(() => {
        const hasActive = jobs.some(j => j.status === 'running' || j.status === 'pending');
        if (!hasActive) return;
        const interval = setInterval(loadJobs, 10000);
        return () => clearInterval(interval);
    }, [jobs, loadJobs]);

    const handleTrigger = async () => {
        setConfirmOpen(false);
        setTriggering(true);
        try {
            const data = await triggerRetraining(triggerTarget, 'frontend_admin');
            showSnackbar(data.message || 'Retraining triggered!', 'success');
            setTimeout(loadJobs, 1500);
        } catch (e) {
            showSnackbar(e.response?.data?.detail || e.message, 'error');
        } finally {
            setTriggering(false);
        }
    };

    // KPI counts
    const completedCount = jobs.filter(j => j.status === 'completed').length;
    const promotedCount = jobs.filter(j => j.promoted).length;
    const failedCount = jobs.filter(j => j.status === 'failed').length;
    const runningCount = jobs.filter(j => j.status === 'running' || j.status === 'pending').length;

    return (
        <div>
            {/* Confirm Dialog */}
            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                maxWidth="xs"
                fullWidth
                TransitionComponent={Fade}
                PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, fontSize: '1.1rem' }}>
                    <RotateCcw size={20} color="#6366F1" />
                    Confirm Retraining
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                        Are you sure you want to trigger retraining for{' '}
                        <strong>{triggerTarget === 'ALL' ? 'all schemas (A, B, C, D)' : `schema ${triggerTarget}`}</strong>?
                        This will build fresh datasets, train new models, and promote them if they outperform the current production models.
                    </DialogContentText>
                    {triggering && <LinearProgress sx={{ mt: 2 }} />}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmOpen(false)} disabled={triggering} variant="outlined" size="small">
                        Cancel
                    </Button>
                    <Button onClick={handleTrigger} disabled={triggering} variant="contained" size="small"
                        sx={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' } }}
                    >
                        {triggering ? 'Triggering…' : 'Confirm & Retrain'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert severity={snackbar.severity} variant="standard" onClose={() => setSnackbar(p => ({ ...p, open: false }))} sx={{ fontWeight: 600, boxShadow: 3 }}>
                    {snackbar.msg}
                </Alert>
            </Snackbar>

            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <div className="page-breadcrumb">MLOps › Retraining</div>
                    <h1>Model Retraining</h1>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                    <Select
                        size="small"
                        value={filterSchema}
                        onChange={e => setFilterSchema(e.target.value)}
                        displayEmpty
                        sx={{ width: 130, height: 32, fontSize: '0.8rem', fontWeight: 600, backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', '& fieldset': { borderColor: 'var(--border)' }, '&:hover fieldset': { borderColor: 'var(--border-strong)' }, '&.Mui-focused fieldset': { borderColor: 'var(--accent-green) !important', borderWidth: '1px !important' } }}
                    >
                        <MenuItem value="" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>All Schemas</MenuItem>
                        {SCHEMAS.map(s => <MenuItem key={s} value={s} sx={{ fontSize: '0.8rem', fontWeight: 500 }}>Schema {s}</MenuItem>)}
                    </Select>

                    <Button variant="outlined" size="small" onClick={loadJobs} startIcon={<RefreshCw size={14} />}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
                    >
                        Refresh
                    </Button>

                    <Select
                        size="small"
                        value={triggerTarget}
                        onChange={e => setTriggerTarget(e.target.value)}
                        sx={{ width: 130, height: 32, fontSize: '0.8rem', fontWeight: 600, backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', '& fieldset': { borderColor: 'var(--border)' }, '&:hover fieldset': { borderColor: 'var(--border-strong)' }, '&.Mui-focused fieldset': { borderColor: '#6366F1 !important', borderWidth: '1px !important' } }}
                    >
                        <MenuItem value="ALL" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>All Schemas</MenuItem>
                        {SCHEMAS.map(s => <MenuItem key={s} value={s} sx={{ fontSize: '0.8rem', fontWeight: 500 }}>Schema {s}</MenuItem>)}
                    </Select>

                    <Tooltip title={runningCount > 0 ? 'Jobs are already running' : `Trigger retraining for ${triggerTarget}`} arrow>
                        <span>
                            <Button
                                variant="contained"
                                size="small"
                                disabled={triggering}
                                onClick={() => setConfirmOpen(true)}
                                startIcon={triggering ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
                                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' } }}
                            >
                                {triggering ? 'Triggering…' : 'Trigger Retraining'}
                            </Button>
                        </span>
                    </Tooltip>
                </div>
            </div>

            <div className="page-body">
                {/* KPI Cards */}
                <Fade in>
                    <div className="kpi-grid animate-fade" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
                        <div className="kpi-card">
                            <div className="kpi-label">Total Runs</div>
                            <div className="kpi-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Zap size={20} color="#6366F1" /> {totalJobs}
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">Completed</div>
                            <div className="kpi-value" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669' }}>
                                <CheckCircle size={20} color="#059669" /> {completedCount}
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">Models Promoted</div>
                            <div className="kpi-value" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8B5CF6' }}>
                                <Award size={20} color="#8B5CF6" /> {promotedCount}
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">Failed</div>
                            <div className="kpi-value" style={{ display: 'flex', alignItems: 'center', gap: 8, color: failedCount > 0 ? '#F43F5E' : 'var(--text-muted)' }}>
                                <XCircle size={20} color={failedCount > 0 ? '#F43F5E' : 'var(--text-muted)'} /> {failedCount}
                            </div>
                        </div>
                    </div>
                </Fade>

                {/* Active Jobs Banner */}
                {runningCount > 0 && (
                    <Fade in>
                        <Box sx={{
                            mb: 2, p: 2, borderRadius: 2,
                            background: 'linear-gradient(135deg, #EFF6FF, #EEF2FF)',
                            border: '1px solid #93C5FD',
                            display: 'flex', alignItems: 'center', gap: 1.5,
                        }}>
                            <Loader2 size={18} color="#3B82F6" className="spin" />
                            <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: '#1E40AF' }}>
                                {runningCount} retraining job{runningCount > 1 ? 's' : ''} currently active — auto-refreshing every 10s
                            </Typography>
                        </Box>
                    </Fade>
                )}

                {/* Jobs Table */}
                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 350, gap: 2, background: 'var(--bg-card)', borderRadius: 2, border: '1px solid var(--border)' }} className="animate-fade">
                        <div style={{ display: 'flex', position: 'relative', alignItems: 'center', justifyContent: 'center', width: 90, height: 90 }}>
                            <div className="custom-spin-wrapper" style={{ position: 'absolute' }}>
                                <Loader2 size={80} color="var(--accent-blue)" />
                            </div>
                            <div className="custom-ping-wrapper" style={{ position: 'absolute' }}>
                                <RotateCcw size={34} color="#6366F1" />
                            </div>
                        </div>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)', mt: 2 }}>Loading Retraining History...</Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 350, textAlign: 'center', lineHeight: 1.6 }}>
                            Fetching job records across all schema models.
                        </Typography>
                    </Box>
                ) : jobs.length === 0 ? (
                    <div className="empty-state animate-fade">
                        <div className="empty-state-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
                            <RotateCcw size={48} color="var(--text-muted)" />
                        </div>
                        <h3>No retraining jobs yet</h3>
                        <p>Use the "Trigger Retraining" button above to start your first retraining cycle.</p>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: 90 }}>Schema</th>
                                        <th style={{ width: 110 }}>Status</th>
                                        <th style={{ width: 90 }}>Promoted</th>
                                        <th>Macro F1</th>
                                        <th>Accuracy</th>
                                        <th>Model Version</th>
                                        <th>Triggered By</th>
                                        <th>Started</th>
                                        <th>Completed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.map((job) => {
                                        const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
                                        const StatusIcon = cfg.icon;
                                        const f1 = job.evaluation_metrics?.macro_f1;
                                        const acc = job.evaluation_metrics?.accuracy;

                                        return (
                                            <Tooltip key={job.id} title={job.error_message || ''} arrow placement="bottom" disableHoverListener={!job.error_message}>
                                                <tr style={{
                                                    borderLeft: `3px solid ${cfg.color}`,
                                                    background: job.status === 'failed' ? 'var(--accent-rose-lt)' : undefined,
                                                }}>
                                                    <td>
                                                        <Chip label={`Schema ${job.schema_type}`} size="small"
                                                            sx={{ fontWeight: 700, fontSize: '0.72rem', background: '#EEF2FF', color: '#6366F1', border: '1px solid #C7D2FE', '& .MuiChip-label': { px: 0.8 } }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <StatusIcon size={15} color={cfg.color}
                                                                className={job.status === 'running' ? 'spin' : ''}
                                                            />
                                                            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: cfg.color }}>
                                                                {cfg.label}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {job.status === 'completed' && (
                                                            job.promoted ? (
                                                                <Chip label="✓ Promoted" size="small"
                                                                    sx={{ fontWeight: 700, fontSize: '0.68rem', background: 'var(--accent-green-lt)', color: '#059669', border: '1px solid var(--accent-green-border)', '& .MuiChip-label': { px: 0.7 } }}
                                                                />
                                                            ) : (
                                                                <Chip label="Not Promoted" size="small"
                                                                    sx={{ fontWeight: 600, fontSize: '0.68rem', background: 'var(--bg-primary)', color: 'var(--text-muted)', border: '1px solid var(--border)', '& .MuiChip-label': { px: 0.7 } }}
                                                                />
                                                            )
                                                        )}
                                                    </td>
                                                    <td>
                                                        {f1 !== undefined ? (
                                                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: f1 >= 0.7 ? '#059669' : f1 >= 0.5 ? '#F59E0B' : '#F43F5E' }}>
                                                                {(f1 * 100).toFixed(1)}%
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {acc !== undefined ? (
                                                            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                                                {(acc * 100).toFixed(1)}%
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {job.new_model_version ? (
                                                            <span style={{ fontWeight: 600, fontSize: '0.8rem', fontFamily: 'DM Mono, monospace', color: 'var(--text-primary)' }}>
                                                                v{job.new_model_version}
                                                                {job.old_model_version && (
                                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}> ← v{job.old_model_version}</span>
                                                                )}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                            {job.triggered_by || '—'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            {fmtDate(job.started_at)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            {fmtDate(job.completed_at)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            </Tooltip>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
