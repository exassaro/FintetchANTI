import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Activity, Calendar } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
    ResponsiveContainer, Legend
} from 'recharts';
import { usePipeline } from '../context/PipelineContext';
import { getTimeSeries } from '../api/analytics';
import { Skeleton, Alert as MuiAlert, Box } from '@mui/material';

const fmtINR = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const formatYAxis = (tickItem) => {
    if (typeof tickItem !== 'number') return tickItem;
    if (tickItem >= 1000000000) return (tickItem / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (tickItem >= 1000000) return (tickItem / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (tickItem >= 1000) return (tickItem / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return tickItem;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.82rem', boxShadow: 'var(--shadow-md)' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>{label}</p>
            {payload.filter(p => p.value != null).map(p => (
                <p key={p.dataKey} style={{ color: p.color }}>
                    {p.name}: <strong>{typeof p.value === 'number' && p.value > 100 ? fmtINR(p.value) : p.value}</strong>
                </p>
            ))}
        </div>
    );
};

const METRICS = [
    { value: 'total_expenses', label: 'Total Expenses' },
    { value: 'net_amount', label: 'Net Amount' },
    { value: 'gst_liability', label: 'GST Liability' },
    { value: 'itc_eligible_amount', label: 'ITC Eligible Amount' },
    { value: 'txn_count', label: 'Transaction Count' },
];

export default function TimeSeriesPage() {
    const { uploadId } = usePipeline();
    const navigate = useNavigate();
    const [metric, setMetric] = useState('total_expenses');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [anim, setAnim] = useState(false);

    useEffect(() => {
        if (!uploadId) { navigate('/'); return; }
        setLoading(true);
        setError(null);
        getTimeSeries(uploadId, metric)
            .then(r => setData(r))
            .catch(e => setError(e.response?.data?.detail || e.message))
            .finally(() => setLoading(false));
    }, [uploadId, metric]);

    const chartData = data?.history?.map(h => ({ month: h.month?.slice(0, 7), value: h.value })) || [];

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <div className="page-breadcrumb">Analytics › Time Series</div>
                    <h1>Time Series</h1>
                </div>
                <select
                    className="input-field"
                    style={{ width: 220, marginTop: 8 }}
                    value={metric}
                    onChange={e => setMetric(e.target.value)}
                >
                    {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
            </div>

            <div className="page-body">
                {error && <div className="alert alert-error animate-fade"><AlertTriangle size={18} /> {error}</div>}

                <div className="card animate-fade">
                    <div className="card-header">
                        <span className="card-title-lg">
                            <Activity size={16} style={{ display: 'inline', marginRight: 8 }} />
                            {METRICS.find(m => m.value === metric)?.label} — Monthly Trend
                        </span>
                        {data?.meta && (
                            <span className="chip chip-blue">{data.meta.n_points} data points</span>
                        )}
                    </div>

                    {loading ? (
                        <Box sx={{ p: 3 }}><Skeleton variant="rounded" height={360} animation="wave" /></Box>
                    ) : (
                        <div className="chart-container" style={{ height: 360 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }} onMouseEnter={() => setTimeout(() => setAnim(true), 100)} onMouseLeave={() => setAnim(false)}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                                    <Tooltip content={<CustomTooltip />} isAnimationActive={anim} />
                                    <Line
                                        type="linear"
                                        dataKey="value"
                                        name={METRICS.find(m => m.value === metric)?.label}
                                        stroke="#059669"
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: '#059669', strokeWidth: 0 }}
                                        activeDot={{ r: 6, fill: '#047857' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Stats */}
                {chartData.length > 0 && (
                    <div className="kpi-grid section-gap animate-fade" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                        {[
                            { label: 'Months of Data', value: chartData.length },
                            { label: 'Peak Month', value: chartData.reduce((a, b) => b.value > a.value ? b : a, chartData[0])?.month || '—' },
                            { label: 'Peak Value', value: metric.includes('expenses') || metric.includes('liability') || metric.includes('amount') ? fmtINR(Math.max(...chartData.map(d => d.value))) : Math.max(...chartData.map(d => d.value))?.toLocaleString() },
                            { label: 'Average', value: metric.includes('expenses') || metric.includes('liability') || metric.includes('amount') ? fmtINR(chartData.reduce((s, d) => s + d.value, 0) / chartData.length) : (chartData.reduce((s, d) => s + d.value, 0) / chartData.length).toFixed(0) },
                        ].map(k => (
                            <div className="kpi-card" key={k.label}>
                                <div className="kpi-label">{k.label}</div>
                                <div className="kpi-value" style={{ fontSize: '1.25rem' }}>{k.value}</div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && chartData.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
                            <Calendar size={48} color="var(--text-muted)" />
                        </div>
                        <h3>No time-series data</h3>
                        <p>Ensure your CSV contains a date/transaction_date column.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
