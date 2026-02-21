import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle, CheckCircle, XCircle, Eye, Filter, Loader2, Calendar, Search
} from 'lucide-react';
import { usePipeline } from '../context/PipelineContext';
import { getReviewQueue, submitReviewDecision, clearReviewQueueCache } from '../api/analytics';
import {
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Button, Snackbar, Alert, Chip, Tooltip, Fade, Skeleton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Box, Typography, IconButton, Collapse, LinearProgress
} from '@mui/material';

const fmtINR = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v ?? 0);

export default function ReviewPage() {
    const { uploadId } = usePipeline();
    const navigate = useNavigate();

    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, msg: '', severity: 'success' });
    const [expanded, setExpanded] = useState(null);

    const [filterType, setFilterType] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');

    const [pendingDecisions, setPendingDecisions] = useState({});
    const [correctedSlabs, setCorrectedSlabs] = useState({});

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [batchSubmitting, setBatchSubmitting] = useState(false);

    const showSnackbar = (msg, severity = 'success') => {
        setSnackbar({ open: true, msg, severity });
    };

    const loadQueue = useCallback((forceRefresh = false) => {
        if (!uploadId) { navigate('/'); return; }
        if (forceRefresh === true) clearReviewQueueCache(uploadId);

        setLoading(true);
        setError(null);
        getReviewQueue(uploadId, filterType || null)
            .then(r => setQueue(r.records || r.queue || []))
            .catch(e => setError(e.response?.data?.detail || e.message))
            .finally(() => setLoading(false));
    }, [uploadId, filterType]);

    useEffect(() => { loadQueue(); }, [loadQueue]);

    const markDecision = (rowIndex, decision) => {
        setPendingDecisions(prev => {
            const next = { ...prev };
            if (next[rowIndex] === decision) delete next[rowIndex];
            else next[rowIndex] = decision;
            return next;
        });
    };

    const confirmSubmit = async () => {
        setBatchSubmitting(true);
        const entries = Object.entries(pendingDecisions);
        let errorCount = 0;

        for (const [rIdx, decision] of entries) {
            try {
                await submitReviewDecision(uploadId, {
                    row_index: parseInt(rIdx, 10),
                    decision,
                    rationale: decision === 'CONFIRMED' ? 'Confirmed anomaly' : 'Not an anomaly',
                    corrected_gst_slab: correctedSlabs[rIdx]
                });
            } catch (e) {
                errorCount++;
            }
        }

        setBatchSubmitting(false);
        setIsConfirmOpen(false);

        if (errorCount > 0) {
            showSnackbar(`Submitted, but encountered ${errorCount} errors.`, 'error');
        } else {
            showSnackbar('All changes submitted and analytics updated!', 'success');
        }

        setPendingDecisions({});
        setCorrectedSlabs({});
        loadQueue(true); // force cache bust on submit
    };

    const scoreColor = (score) => {
        if (score >= 0.75) return '#F43F5E';
        if (score >= 0.5) return '#F59E0B';
        return '#059669';
    };

    const scoreBg = (score) => {
        if (score >= 0.75) return 'rgba(244, 63, 94, 0.06)';
        if (score >= 0.5) return 'rgba(245, 158, 11, 0.05)';
        return 'rgba(16, 185, 129, 0.05)';
    };

    const filteredQueue = queue.filter(r => {
        if (!severityFilter) return true;
        const score = r.anomaly_score ?? 0;
        if (severityFilter === 'high') return score >= 0.75;
        if (severityFilter === 'medium') return score >= 0.5 && score < 0.75;
        if (severityFilter === 'low') return score < 0.5;
        return true;
    });

    return (
        <div>
            {/* MUI Confirm Dialog */}
            <Dialog
                open={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                maxWidth="xs"
                fullWidth
                TransitionComponent={Fade}
                PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, fontSize: '1.1rem' }}>
                    <AlertTriangle size={20} color="#F43F5E" />
                    Confirm Review Changes
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                        Are you sure you want to permanently submit your{' '}
                        <strong>{Object.keys(pendingDecisions).length}</strong> pending reviews?
                        The underlying analytical dataset and caches will be refreshed.
                    </DialogContentText>
                    {batchSubmitting && <LinearProgress sx={{ mt: 2 }} />}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setIsConfirmOpen(false)} disabled={batchSubmitting} variant="outlined" size="small">
                        Cancel
                    </Button>
                    <Button onClick={confirmSubmit} disabled={batchSubmitting} variant="contained" size="small">
                        {batchSubmitting ? 'Submitting…' : 'Confirm & Submit'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MUI Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    variant="standard"
                    onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                    sx={{ fontWeight: 600, boxShadow: 3 }}
                >
                    {snackbar.msg}
                </Alert>
            </Snackbar>

            <div className="page-header">
                <div className="page-header-left">
                    <div className="page-breadcrumb">Review & AI › Review Queue</div>
                    <h1>Review Queue</h1>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                    <Filter size={15} color="var(--text-muted)" />
                    <select className="input-field" style={{ width: 160 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="">All Types</option>
                        <option value="anomaly">Anomaly Flagged</option>
                        <option value="low_confidence">Low Confidence</option>
                    </select>
                    <select className="input-field" style={{ width: 140 }} value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
                        <option value="">All Severities</option>
                        <option value="high">High Severity</option>
                        <option value="medium">Medium Severity</option>
                        <option value="low">Low Severity</option>
                    </select>
                    <Button variant="outlined" size="small" onClick={() => loadQueue(true)} sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}>
                        Refresh
                    </Button>
                    <Tooltip title={Object.keys(pendingDecisions).length === 0 ? 'Mark items first' : `Submit ${Object.keys(pendingDecisions).length} pending reviews`} arrow>
                        <span>
                            <Button
                                variant="contained"
                                size="small"
                                disabled={Object.keys(pendingDecisions).length === 0}
                                onClick={() => setIsConfirmOpen(true)}
                                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
                            >
                                Submit ({Object.keys(pendingDecisions).length})
                            </Button>
                        </span>
                    </Tooltip>
                </div>
            </div>

            <div className="page-body">
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} /> {error}
                    </Alert>
                )}

                {/* KPI Summary */}
                {!loading && queue.length > 0 && (
                    <Fade in>
                        <div className="kpi-grid animate-fade" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
                            <div className="kpi-card">
                                <div className="kpi-label">Items in Queue</div>
                                <div className="kpi-value">{filteredQueue.length} {filteredQueue.length < queue.length && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> (Filtered)</span>}</div>
                            </div>
                            <div className="kpi-card danger">
                                <div className="kpi-label">High Severity in View</div>
                                <div className="kpi-value" style={{ color: 'var(--accent-rose)' }}>
                                    {filteredQueue.filter(r => (r.anomaly_score ?? 0) >= 0.75).length}
                                </div>
                            </div>
                            <div className="kpi-card amber">
                                <div className="kpi-label">Total View Value</div>
                                <div className="kpi-value" style={{ fontSize: '1.3rem' }}>
                                    {fmtINR(filteredQueue.reduce((s, r) => s + (r.amount ?? 0), 0))}
                                </div>
                            </div>
                        </div>
                    </Fade>
                )}

                {/* Queue Table */}
                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 450, gap: 2, background: '#fff', borderRadius: 2, border: '1px solid var(--border)' }} className="animate-fade">
                        <div style={{ display: 'flex', position: 'relative', alignItems: 'center', justifyContent: 'center', width: 90, height: 90 }}>
                            <div className="custom-spin-wrapper" style={{ position: 'absolute' }}>
                                <Loader2 size={80} color="var(--accent-blue)" />
                            </div>
                            <div className="custom-ping-wrapper" style={{ position: 'absolute' }}>
                                <Search size={34} color="var(--accent-indigo)" />
                            </div>
                        </div>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B', mt: 2 }}>Analyzing Transactions...</Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 350, textAlign: 'center', lineHeight: 1.6 }}>We are deeply cross-referencing your financial data against expected GST slabs and multi-signal fraud models. Hang tight.</Typography>
                    </Box>
                ) : queue.length === 0 ? (
                    <div className="empty-state animate-fade">
                        <div className="empty-state-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
                            <CheckCircle size={48} color="var(--accent-green)" />
                        </div>
                        <h3>Queue is empty</h3>
                        <p>All flagged transactions have been reviewed, or no anomalies were detected.</p>
                    </div>
                ) : filteredQueue.length === 0 ? (
                    <div className="empty-state animate-fade">
                        <div className="empty-state-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
                            <Filter size={48} color="var(--text-muted)" />
                        </div>
                        <h3>No items match your filters</h3>
                        <p>Try adjusting the flag type or severity dropdown settings.</p>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: 70 }}>Score</th>
                                        <th>Transaction</th>
                                        <th style={{ width: 100 }}>Amount</th>
                                        <th style={{ width: 80 }}>GST</th>
                                        <th style={{ width: 120 }}>Flag</th>
                                        <th style={{ width: 100 }}>Status</th>
                                        <th style={{ width: 200, textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredQueue.map((row, idx) => {
                                        const score = row.anomaly_score ?? 0;
                                        const isPending = !!pendingDecisions[row.row_index];

                                        return (
                                            <React.Fragment key={row.row_index ?? idx}>
                                                <tr style={{
                                                    backgroundColor: scoreBg(score),
                                                    borderLeft: isPending
                                                        ? `3px solid ${pendingDecisions[row.row_index] === 'CONFIRMED' ? '#F43F5E' : '#059669'}`
                                                        : '3px solid transparent'
                                                }}>
                                                    <td>
                                                        <span title={`Anomaly score: ${score.toFixed(4)}`} style={{ fontSize: '1.1rem', fontWeight: 800, color: scoreColor(score), cursor: 'help' }}>
                                                            {score.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 600, color: '#1E293B', marginBottom: 2 }}>
                                                            {row.description || row.vendor_name || `Transaction #${row.row_index}`}
                                                        </div>
                                                        {row.transaction_date && (
                                                            <div className="text-muted" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <Calendar size={11} /> {row.transaction_date?.slice(0, 10)}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span style={{ color: '#3B82F6', fontWeight: 600, fontSize: '0.84rem' }}>
                                                            {fmtINR(row.amount)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {row.gst_slab_predicted !== undefined && (
                                                            <span className="chip chip-violet">
                                                                {row.gst_slab_predicted}%
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {row.flag_type && (
                                                            <span className={row.flag_type === 'anomaly' ? 'chip chip-red' : 'chip chip-amber'}>
                                                                {row.flag_type === 'anomaly' ? 'Anomaly' : 'Low Conf.'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {isPending && (
                                                            <span className="chip" style={{ background: '#1E293B', color: '#fff' }}>
                                                                {pendingDecisions[row.row_index] === 'CONFIRMED' ? 'Flagging' : 'Clearing'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                                                            {row.flag_type === 'low_confidence' && (
                                                                <select
                                                                    className="custom-select custom-tooltip"
                                                                    data-tooltip="Override GST Slab"
                                                                    style={{ height: 26, width: 68 }}
                                                                    value={correctedSlabs[row.row_index] ?? row.gst_slab_predicted ?? ''}
                                                                    onChange={e => setCorrectedSlabs(prev => ({ ...prev, [row.row_index]: Number(e.target.value) }))}
                                                                >
                                                                    <option value="0">0%</option>
                                                                    <option value="5">5%</option>
                                                                    <option value="18">18%</option>
                                                                    <option value="40">40%</option>
                                                                </select>
                                                            )}
                                                            <button
                                                                className={`btn btn-icon custom-tooltip ${pendingDecisions[row.row_index] === 'REJECTED' ? 'btn-success' : 'btn-secondary'}`}
                                                                data-tooltip="Mark as not an anomaly"
                                                                onClick={() => markDecision(row.row_index, 'REJECTED')}
                                                            >
                                                                <CheckCircle size={14} />
                                                            </button>
                                                            <button
                                                                className={`btn btn-icon custom-tooltip ${pendingDecisions[row.row_index] === 'CONFIRMED' ? 'btn-danger' : 'btn-secondary'}`}
                                                                data-tooltip="Confirm as anomaly"
                                                                onClick={() => markDecision(row.row_index, 'CONFIRMED')}
                                                            >
                                                                <XCircle size={14} />
                                                            </button>
                                                            <button
                                                                className="btn btn-icon btn-secondary custom-tooltip"
                                                                style={{ color: expanded === row.row_index ? '#059669' : '' }}
                                                                data-tooltip="View full details"
                                                                onClick={() => setExpanded(expanded === row.row_index ? null : row.row_index)}
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Expanded details row */}
                                                {expanded === row.row_index && (
                                                    <tr style={{ background: '#F8FAFC' }}>
                                                        <td colSpan={7} style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
                                                            <div className="card-glass">
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                                                                    {Object.entries(row)
                                                                        .filter(([k]) => [
                                                                            'transaction_id', 'transaction_date', 'amount', 'currency',
                                                                            'description', 'vendor_name', 'category', 'gst_slab_predicted',
                                                                            'gst_confidence', 'gst_slab_final', 'review_status'
                                                                        ].includes(k))
                                                                        .map(([k, v]) => (
                                                                            <div key={k}>
                                                                                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94A3B8', fontWeight: 700, marginBottom: 2 }}>{k}</div>
                                                                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>{typeof v === 'number' ? v.toLocaleString() : String(v ?? '—')}</div>
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                                {row.anomaly_reasons && (
                                                                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed #E2E8F0' }}>
                                                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F43F5E', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                                            <AlertTriangle size={14} /> Anomaly Reasons
                                                                        </div>
                                                                        <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.82rem', color: '#475569', lineHeight: 1.6 }}>
                                                                            {(Array.isArray(row.anomaly_reasons) ? row.anomaly_reasons : [row.anomaly_reasons]).map((r, i) => (
                                                                                <li key={i}>{r}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
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
