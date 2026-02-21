import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle, CheckCircle, XCircle, Eye,
    Filter, Loader2
} from 'lucide-react';
import { usePipeline } from '../context/PipelineContext';
import { getReviewQueue, submitReviewDecision } from '../api/analytics';

const fmtINR = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v ?? 0);

export default function ReviewPage() {
    const { uploadId } = usePipeline();
    const navigate = useNavigate();

    // Core State
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [expanded, setExpanded] = useState(null);

    // Filters
    const [filterType, setFilterType] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');

    // Review State (Batch approach)
    const [pendingDecisions, setPendingDecisions] = useState({});
    const [correctedSlabs, setCorrectedSlabs] = useState({});

    // Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [batchSubmitting, setBatchSubmitting] = useState(false);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadQueue = useCallback(() => {
        if (!uploadId) { navigate('/'); return; }
        setLoading(true);
        setError(null);
        getReviewQueue(uploadId, filterType || null)
            .then(r => setQueue(r.records || r.queue || []))
            .catch(e => setError(e.response?.data?.detail || e.message))
            .finally(() => setLoading(false));
    }, [uploadId, filterType]);

    useEffect(() => { loadQueue(); }, [loadQueue]);

    // Track a row's decision locally instead of submitting immediately
    const markDecision = (rowIndex, decision) => {
        setPendingDecisions(prev => {
            const next = { ...prev };
            // Auto-toggle: If clicking the same decision again, clear it instead
            if (next[rowIndex] === decision) delete next[rowIndex];
            else next[rowIndex] = decision;
            return next;
        });
    };

    // Process all pending decisions when Modal confirmed
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
            showToast(`Submitted, but encountered ${errorCount} errors.`, 'error');
        } else {
            showToast('All changes submitted and analytics updated!', 'success');
        }

        setPendingDecisions({});
        setCorrectedSlabs({});
        loadQueue();
    };

    const scoreColor = (score) => {
        if (score >= 0.75) return 'var(--accent-rose)';
        if (score >= 0.5) return 'var(--accent-amber)';
        return 'var(--accent-emerald)';
    };

    // Apply Client-Side Filtering
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
            {/* Custom Confirm Modal Layer */}
            {isConfirmOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card animate-fade" style={{ width: 420, padding: 24, background: '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertTriangle size={18} color="var(--accent-rose)" />
                            Confirm Review Changes
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                            Are you sure you want to permanently submit your <strong>{Object.keys(pendingDecisions).length}</strong> pending reviews? The underlying analytical dataset and application caches will be automatically refreshed.
                        </p>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
                            <button className="btn btn-secondary" onClick={() => setIsConfirmOpen(false)} disabled={batchSubmitting}>Cancel</button>
                            <button className="btn btn-primary" onClick={confirmSubmit} disabled={batchSubmitting}>
                                {batchSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Confirm & Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div className="page-header-left">
                    <div className="page-breadcrumb">Review & AI › Review Queue</div>
                    <h1>Review Queue</h1>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                    <Filter size={15} color="var(--text-muted)" />

                    {/* Flag Type Filter */}
                    <select
                        className="input-field" style={{ width: 160 }}
                        value={filterType} onChange={e => setFilterType(e.target.value)}
                    >
                        <option value="">All Types</option>
                        <option value="anomaly">Anomaly Flagged</option>
                        <option value="low_confidence">Low Confidence</option>
                    </select>

                    {/* Severity Filter */}
                    <select
                        className="input-field" style={{ width: 140 }}
                        value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
                    >
                        <option value="">All Severities</option>
                        <option value="high">High Severity</option>
                        <option value="medium">Medium Severity</option>
                        <option value="low">Low Severity</option>
                    </select>

                    <button className="btn btn-secondary btn-sm" onClick={loadQueue}>Refresh</button>
                    <button
                        className="btn btn-primary btn-sm"
                        disabled={Object.keys(pendingDecisions).length === 0}
                        onClick={() => setIsConfirmOpen(true)}
                    >
                        Submit ({Object.keys(pendingDecisions).length})
                    </button>
                </div>
            </div>

            <div className="page-body">
                {/* Toast Message */}
                {toast && (
                    <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'} animate-fade`} style={{ marginBottom: 16 }}>
                        {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                        {toast.msg}
                    </div>
                )}

                {error && <div className="alert alert-error animate-fade"><AlertTriangle size={18} /> {error}</div>}

                {/* KPI Summary */}
                {!loading && queue.length > 0 && (
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
                )}

                {/* Queue Rendering */}
                {loading ? (
                    <div className="loading-overlay"><div className="spinner spinner-lg" /><p>Loading review queue…</p></div>
                ) : queue.length === 0 ? (
                    <div className="empty-state animate-fade">
                        <div className="empty-state-icon">✅</div>
                        <h3>Queue is empty</h3>
                        <p>All flagged transactions have been reviewed, or no anomalies were detected.</p>
                    </div>
                ) : filteredQueue.length === 0 ? (
                    <div className="empty-state animate-fade">
                        <div className="empty-state-icon">🔍</div>
                        <h3>No items match your filters</h3>
                        <p>Try adjusting the flag type or severity dropdown settings.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filteredQueue.map((row, idx) => {
                            const score = row.anomaly_score ?? 0;
                            const isPending = !!pendingDecisions[row.row_index];

                            // Severity shaded background
                            let bgStyle = { backgroundColor: '#fff' };
                            if (score >= 0.75) bgStyle.backgroundColor = 'rgba(244, 63, 94, 0.04)'; // Light red tint
                            else if (score >= 0.5) bgStyle.backgroundColor = 'rgba(245, 158, 11, 0.04)'; // Light amber tint
                            else bgStyle.backgroundColor = 'rgba(16, 185, 129, 0.04)'; // Light green tint

                            // Outline if this row is pending submit
                            if (isPending) {
                                bgStyle.border = `1px solid ${pendingDecisions[row.row_index] === 'CONFIRMED' ? 'var(--accent-rose)' : 'var(--accent-emerald)'}`;
                            }

                            return (
                                <div key={row.row_index ?? idx} className="card animate-fade" style={{ padding: '16px 20px', transition: 'border 0.2s', ...bgStyle }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                        {/* Score Block */}
                                        <div style={{ minWidth: 64, textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>SCORE</div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: scoreColor(score) }}>
                                                {score.toFixed(2)}
                                            </div>
                                        </div>

                                        {/* Info Block */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: 2 }}>
                                                {row.description || row.vendor_name || `Transaction #${row.row_index}`}
                                            </div>
                                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                {row.transaction_date && <span>📅 {row.transaction_date?.slice(0, 10)}</span>}
                                                {row.amount && <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{fmtINR(row.amount)}</span>}
                                                {row.gst_slab_predicted !== undefined && <span className="chip chip-violet">GST {row.gst_slab_predicted}%</span>}
                                                {row.flag_type && (
                                                    <span className={`chip ${row.flag_type === 'anomaly' ? 'chip-red' : 'chip-amber'}`}>
                                                        {row.flag_type === 'anomaly' ? '🚨 Anomaly' : '⚠️ Low Confidence'}
                                                    </span>
                                                )}
                                                {isPending && (
                                                    <span className="chip" style={{ background: '#1E293B', color: '#fff' }}>
                                                        ⏱️ Pending {pendingDecisions[row.row_index] === 'CONFIRMED' ? 'Flag' : 'Clear'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions Block */}
                                        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                                            {row.flag_type === 'low_confidence' && (
                                                <select
                                                    className="input-field"
                                                    title="Override GST Slab"
                                                    style={{ padding: '0px 8px', height: '28px', fontSize: '0.8rem', width: 80 }}
                                                    value={correctedSlabs[row.row_index] ?? row.gst_slab_predicted ?? ''}
                                                    onChange={e => setCorrectedSlabs(prev => ({ ...prev, [row.row_index]: Number(e.target.value) }))}
                                                >
                                                    <option value="0">0%</option>
                                                    <option value="5">5%</option>
                                                    <option value="18">18%</option>
                                                    <option value="40">40%</option>
                                                </select>
                                            )}

                                            {/* Deferred state buttons */}
                                            <button
                                                className={`btn btn-sm ${pendingDecisions[row.row_index] === 'REJECTED' ? 'btn-success' : 'btn-secondary'}`}
                                                onClick={() => markDecision(row.row_index, 'REJECTED')}
                                            >
                                                <CheckCircle size={13} /> {pendingDecisions[row.row_index] === 'REJECTED' ? 'Clearing' : 'Clear'}
                                            </button>
                                            <button
                                                className={`btn btn-sm ${pendingDecisions[row.row_index] === 'CONFIRMED' ? 'btn-danger' : 'btn-secondary'}`}
                                                onClick={() => markDecision(row.row_index, 'CONFIRMED')}
                                            >
                                                <XCircle size={13} /> {pendingDecisions[row.row_index] === 'CONFIRMED' ? 'Flagging' : 'Flag'}
                                            </button>

                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => setExpanded(expanded === row.row_index ? null : row.row_index)}
                                            >
                                                <Eye size={13} /> Details
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Details Form */}
                                    {expanded === row.row_index && (
                                        <div className="card-glass animate-fade" style={{ marginTop: 14 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                                                {Object.entries(row)
                                                    .filter(([k]) => [
                                                        'transaction_id', 'transaction_date', 'amount', 'currency',
                                                        'description', 'vendor_name', 'category', 'gst_slab_predicted',
                                                        'gst_confidence', 'gst_slab_final', 'review_status'
                                                    ].includes(k))
                                                    .map(([k, v]) => (
                                                        <div key={k}>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k}</div>
                                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                                                {typeof v === 'number' ? v.toLocaleString() : String(v ?? '—')}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                            {row.anomaly_reasons && (
                                                <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    <strong style={{ color: 'var(--text-secondary)' }}>🚨 Anomaly Reasons:</strong>
                                                    <ul style={{ marginTop: 6, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                        {(Array.isArray(row.anomaly_reasons) ? row.anomaly_reasons : [row.anomaly_reasons]).map((r, i) => (
                                                            <li key={i}>{r}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
