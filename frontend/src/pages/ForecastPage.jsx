import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Bot, BarChart2, CalendarClock, ClipboardList } from 'lucide-react';
import {
    ComposedChart, Line, Area, XAxis, YAxis, Tooltip,
    CartesianGrid, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { usePipeline } from '../context/PipelineContext';
import { getForecast } from '../api/analytics';
import { Skeleton, Box } from '@mui/material';

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
                    {p.name}: <strong>{Array.isArray(p.value) ? `${fmtINR(p.value[0])} - ${fmtINR(p.value[1])}` : (p.value > 1000 ? fmtINR(p.value) : p.value?.toFixed(2))}</strong>
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
];

export default function ForecastPage() {
    const { uploadId } = usePipeline();
    const navigate = useNavigate();
    const [metric, setMetric] = useState('total_expenses');
    const [excludeAnomalies, setExcludeAnomalies] = useState(true);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [anim, setAnim] = useState(false);

    const load = () => {
        if (!uploadId) { navigate('/'); return; }
        setLoading(true);
        setError(null);
        getForecast(uploadId, metric, excludeAnomalies)
            .then(r => setData(r))
            .catch(e => setError(e.response?.data?.detail || e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [uploadId, metric, excludeAnomalies]);

    // Combine history + forecast for chart
    const historyData = data?.result?.history?.map(h => ({ month: h.month?.slice(0, 7), historical: h.value })) || [];
    const lastHistoryMonth = historyData[historyData.length - 1]?.month;

    const forecastData = data?.result?.forecast?.map(f => ({
        month: f.month?.slice(0, 7),
        forecast: f.yhat,
        upper: f.yhat_upper,
        lower: f.yhat_lower,
        confidenceBand: [f.yhat_lower, f.yhat_upper],
        model: f.model_used,
    })) || [];

    const chartData = [
        ...historyData,
        ...(lastHistoryMonth ? [{ month: lastHistoryMonth, forecast: historyData[historyData.length - 1]?.historical }] : []),
        ...forecastData,
    ];

    const meta = data?.result?.meta;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <div className="page-breadcrumb">Analytics › Forecast</div>
                    <h1>GST Forecast</h1>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                    <select className="input-field" style={{ width: 200 }} value={metric} onChange={e => setMetric(e.target.value)}>
                        {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={excludeAnomalies} onChange={e => setExcludeAnomalies(e.target.checked)} />
                        Exclude Anomalies
                    </label>
                </div>
            </div>

            <div className="page-body">
                {error && <div className="alert alert-error animate-fade"><AlertTriangle size={18} /> {error}</div>}

                {/* Meta info */}
                {meta && (
                    <div className="card card-sm animate-fade" style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                            <span className="chip chip-violet" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Bot size={12} /> Model: {meta.model_used}</span>
                            <span className="chip chip-blue" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BarChart2 size={12} /> {meta.n_points} historical points</span>
                            <span className="chip chip-green" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarClock size={12} /> {meta.horizon_months} months horizon</span>
                            {meta.warnings?.length > 0 && (
                                <span className="chip chip-amber"><AlertTriangle size={11} /> {meta.warnings[0]}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Forecast Chart */}
                <div className="card animate-fade">
                    <div className="card-header">
                        <span className="card-title-lg">
                            <TrendingUp size={16} style={{ display: 'inline', marginRight: 8 }} />
                            {METRICS.find(m => m.value === metric)?.label} — 6-Month Forecast
                        </span>
                    </div>

                    {loading ? (
                        <Box sx={{ p: 3 }}><Skeleton variant="rounded" height={380} animation="wave" /></Box>
                    ) : (
                        <div className="chart-container" style={{ height: 380 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }} onMouseEnter={() => setTimeout(() => setAnim(true), 100)} onMouseLeave={() => setAnim(false)}>
                                    <defs>
                                        <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.12} />
                                            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0.04} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                                    <Tooltip content={<CustomTooltip />} isAnimationActive={anim} />
                                    <ReferenceLine x={lastHistoryMonth} stroke="#CBD5E1" strokeDasharray="4 4" label={{ value: 'Forecast →', position: 'insideTopRight', fill: 'var(--text-muted)', fontSize: 11 }} />
                                    {/* Shaded confidence band between lower and upper bounds */}
                                    <Area type="linear" dataKey="confidenceBand" stroke="none" fill="url(#confidenceGrad)" fillOpacity={1} name="Confidence Band" />
                                    {/* Upper & lower bound dashed border lines */}
                                    <Line type="linear" dataKey="upper" stroke="#A5B4FC" strokeWidth={1} strokeDasharray="4 3" dot={false} name="Upper Bound" />
                                    <Line type="linear" dataKey="lower" stroke="#A5B4FC" strokeWidth={1} strokeDasharray="4 3" dot={false} name="Lower Bound" />
                                    {/* Main lines */}
                                    <Line type="linear" dataKey="historical" stroke="#059669" strokeWidth={2} dot={false} name="Historical" />
                                    <Area type="linear" dataKey="forecast" stroke="#6366F1" strokeWidth={2.5} fill="url(#forecastGrad)" fillOpacity={0.4} dot={{ r: 4, fill: '#6366F1' }} name="Forecast" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Forecast Table */}
                {forecastData.length > 0 && (
                    <div className="card section-gap animate-fade">
                        <div className="card-header">
                            <span className="card-title-lg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={18} /> Forecast Values</span>
                        </div>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Month</th>
                                        <th>Forecast</th>
                                        <th>Lower Bound</th>
                                        <th>Upper Bound</th>
                                        <th>Model</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {forecastData.map((r, i) => (
                                        <tr key={i}>
                                            <td>{r.month}</td>
                                            <td style={{ color: 'var(--accent-violet)', fontWeight: 600 }}>{fmtINR(r.forecast)}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{fmtINR(r.lower)}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{fmtINR(r.upper)}</td>
                                            <td><span className="chip chip-violet">{r.model}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
