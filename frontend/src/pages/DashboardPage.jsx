import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart2, TrendingUp, Activity, AlertTriangle,
    CheckCircle, Eye, Loader2, IndianRupee, Percent, ShieldAlert, PieChart as PieChartIcon
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { usePipeline } from '../context/PipelineContext';
import {
    getDashboardSummary, getSlabDistribution,
    getAnomalyStatistics, getMonthlyTrends, getSlabWiseSpend
} from '../api/analytics';
import {
    Skeleton, Alert as MuiAlert, Button, Tooltip as MuiTooltip, Fade, Box
} from '@mui/material';

const SLAB_COLORS = ['#059669', '#3B82F6', '#F59E0B', '#8B5CF6', '#F43F5E', '#06B6D4'];

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
        <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.82rem',
            boxShadow: 'var(--shadow-md)'
        }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>{label}</p>
            {payload.filter(p => p.value != null).map(p => (
                <p key={p.dataKey} style={{ color: p.color }}>
                    {p.name}: <strong>{typeof p.value === 'number' && p.value > 1000 ? fmtINR(p.value) : p.value}</strong>
                </p>
            ))}
        </div>
    );
};

const renderPieLabel = ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`;

export default function DashboardPage() {
    const { uploadId } = usePipeline();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [slabs, setSlabs] = useState(null);
    const [anomalyStats, setAnomalyStats] = useState(null);
    const [monthly, setMonthly] = useState(null);
    const [slabSpend, setSlabSpend] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [anim, setAnim] = useState(false);

    useEffect(() => {
        if (!uploadId) { navigate('/'); return; }
        const load = async () => {
            setLoading(true);
            try {
                const [s, sl, as_, mt, ss] = await Promise.all([
                    getDashboardSummary(uploadId),
                    getSlabDistribution(uploadId),
                    getAnomalyStatistics(uploadId),
                    getMonthlyTrends(uploadId),
                    getSlabWiseSpend(uploadId),
                ]);
                setSummary(s.summary);
                setSlabs(sl.slab_distribution);
                setAnomalyStats(as_.anomaly_stats);
                setMonthly(mt.monthly_trends);
                setSlabSpend(ss.slab_spend);
            } catch (e) {
                setError(e.response?.data?.detail || e.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [uploadId]);

    if (loading) return (
        <div className="page-body">
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
                {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={110} animation="wave" />)}
            </Box>
            <Skeleton variant="rounded" height={320} animation="wave" sx={{ mb: 3 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Skeleton variant="rounded" height={300} animation="wave" />
                <Skeleton variant="rounded" height={300} animation="wave" />
            </Box>
        </div>
    );

    if (error) return (
        <div className="page-body">
            <MuiAlert severity="error" variant="standard" sx={{ mb: 2 }}>
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} /> {error}
            </MuiAlert>
        </div>
    );

    // Prepare chart data
    const slabPieData = slabs
        ? Object.entries(slabs).map(([k, v]) => ({ name: `${k}% GST`, value: v }))
        : [];

    const monthlyData = monthly?.map(m => ({
        month: m.month.slice(0, 7),
        spend: m.total_spend,
        anomalies: m.anomaly_count,
    })) || [];

    const slabSpendData = slabSpend
        ? Object.entries(slabSpend).map(([k, v]) => ({ slab: `${k}%`, spend: v }))
        : [];

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <div className="page-breadcrumb">Analytics › Overview</div>
                    <h1>Dashboard</h1>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<BarChart2 size={14} />}
                        onClick={() => navigate('/kpi')}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                    >
                        KPI Deep Dive
                    </Button>
                </div>
            </div>

            <div className="page-body">
                {/* ── KPI Row ── */}
                <div className="kpi-grid animate-fade">
                    <div className="kpi-card">
                        <div className="kpi-icon-wrap"><IndianRupee size={16} /></div>
                        <div className="kpi-label">Total Spend</div>
                        <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{fmtINR(summary?.total_spend ?? 0)}</div>
                        <div className="kpi-subtext">{summary?.total_transactions?.toLocaleString()} transactions</div>
                    </div>
                    <div className="kpi-card danger">
                        <div className="kpi-icon-wrap"><ShieldAlert size={16} /></div>
                        <div className="kpi-label">Anomaly Count</div>
                        <div className="kpi-value" style={{ color: 'var(--accent-rose)' }}>{summary?.anomaly_count?.toLocaleString()}</div>
                        <div className="kpi-subtext">{((summary?.anomaly_rate ?? 0) * 100).toFixed(2)}% anomaly rate</div>
                    </div>
                    <div className="kpi-card success">
                        <div className="kpi-icon-wrap"><CheckCircle size={16} /></div>
                        <div className="kpi-label">Avg. GST Confidence</div>
                        <div className="kpi-value" style={{ color: 'var(--accent-green)' }}>
                            {((summary?.avg_confidence ?? 0) * 100).toFixed(1)}%
                        </div>
                        <div className="kpi-subtext">Model classification confidence</div>
                    </div>
                    <div className="kpi-card amber">
                        <div className="kpi-icon-wrap"><Eye size={16} /></div>
                        <div className="kpi-label">Pending Reviews</div>
                        <div className="kpi-value" style={{ color: 'var(--accent-amber)' }}>
                            {summary?.pending_review_count?.toLocaleString()}
                        </div>
                        <div className="kpi-subtext">Requires human queue review</div>
                    </div>
                </div>

                {/* ── Monthly Spend + Anomaly Chart ── */}
                <div className="card section-gap animate-fade">
                    <div className="card-header">
                        <span className="card-title-lg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TrendingUp size={18} /> Monthly Spend & Anomalies
                        </span>
                        <span className="chip chip-blue"><Activity size={11} /> Time Series</span>
                    </div>
                    <div className="chart-container" style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} onMouseEnter={() => setTimeout(() => setAnim(true), 100)} onMouseLeave={() => setAnim(false)}>
                                <defs>
                                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#059669" stopOpacity={0.18} />
                                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="anomGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.14} />
                                        <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                                <Tooltip content={<CustomTooltip />} isAnimationActive={anim} />
                                <Area yAxisId="left" type="linear" dataKey="spend" stroke="#059669" fill="url(#spendGrad)" strokeWidth={2} name="Spend (₹)" />
                                <Area yAxisId="right" type="linear" dataKey="anomalies" stroke="#F43F5E" fill="url(#anomGrad)" strokeWidth={2} name="Anomalies" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Bottom Row: Pie + Bar ── */}
                <div className="grid-2 section-gap">
                    <div className="card animate-fade">
                        <div className="card-header">
                            <span className="card-title-lg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <PieChartIcon size={18} /> GST Slab Distribution
                            </span>
                        </div>
                        <div className="chart-container" style={{ height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={slabPieData}
                                        cx="50%" cy="50%"
                                        outerRadius={90}
                                        dataKey="value"
                                        label={renderPieLabel}
                                        labelLine={false}
                                        isAnimationActive={false}
                                    >
                                        {slabPieData.map((_, i) => <Cell key={i} fill={SLAB_COLORS[i % SLAB_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="card animate-fade">
                        <div className="card-header">
                            <span className="card-title-lg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <IndianRupee size={18} /> Spend by GST Slab
                            </span>
                        </div>
                        <div className="chart-container" style={{ height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={slabSpendData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }} onMouseEnter={() => setTimeout(() => setAnim(true), 100)} onMouseLeave={() => setAnim(false)}>
                                    <XAxis dataKey="slab" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                                    <Tooltip content={<CustomTooltip />} isAnimationActive={anim} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }} />
                                    <Bar dataKey="spend" name="Spend (₹)" radius={[4, 4, 0, 0]}>
                                        {slabSpendData.map((_, i) => <Cell key={i} fill={SLAB_COLORS[i % SLAB_COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* ── Anomaly Severity ── */}
                {anomalyStats && (
                    <div className="card section-gap animate-fade">
                        <div className="card-header">
                            <span className="card-title-lg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AlertTriangle size={18} color="var(--accent-rose)" /> Anomaly Severity Breakdown
                            </span>
                        </div>
                        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                            <div className="card-glass">
                                <div className="kpi-label">Avg. Anomaly Score</div>
                                <div className="kpi-value" style={{ fontSize: '1.6rem' }}>{anomalyStats.avg_anomaly_score?.toFixed(3)}</div>
                            </div>
                            <div className="card-glass">
                                <div className="kpi-label">🔴 High Severity</div>
                                <div className="kpi-value" style={{ fontSize: '1.6rem', color: 'var(--accent-rose)' }}>{anomalyStats.high_severity}</div>
                                <div className="kpi-subtext">score ≥ 0.75</div>
                            </div>
                            <div className="card-glass">
                                <div className="kpi-label">🟡 Medium Severity</div>
                                <div className="kpi-value" style={{ fontSize: '1.6rem', color: 'var(--accent-amber)' }}>{anomalyStats.medium_severity}</div>
                                <div className="kpi-subtext">0.50 – 0.74</div>
                            </div>
                            <div className="card-glass">
                                <div className="kpi-label">🟢 Low Severity</div>
                                <div className="kpi-value" style={{ fontSize: '1.6rem', color: 'var(--accent-green)' }}>{anomalyStats.low_severity}</div>
                                <div className="kpi-subtext">score &lt; 0.50</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
