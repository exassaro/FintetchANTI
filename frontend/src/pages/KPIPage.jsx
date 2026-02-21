import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, IndianRupee, Percent, ShieldCheck, TrendingDown, Crosshair } from 'lucide-react';
import {
    RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { usePipeline } from '../context/PipelineContext';
import { getFinancialKPIs, getComplianceKPIs } from '../api/analytics';
import { Skeleton, Alert as MuiAlert, Box } from '@mui/material';

const fmtINR = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.82rem', boxShadow: 'var(--shadow-md)' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>{label}</p>
            {payload.filter(p => p.value != null).map(p => <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>)}
        </div>
    );
};

export default function KPIPage() {
    const { uploadId } = usePipeline();
    const navigate = useNavigate();
    const [fin, setFin] = useState(null);
    const [comp, setComp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [anim, setAnim] = useState(false);

    useEffect(() => {
        if (!uploadId) { navigate('/'); return; }
        Promise.all([getFinancialKPIs(uploadId), getComplianceKPIs(uploadId)])
            .then(([f, c]) => { setFin(f.financial_kpis); setComp(c.compliance_kpis); })
            .catch(e => setError(e.response?.data?.detail || e.message))
            .finally(() => setLoading(false));
    }, [uploadId]);

    if (loading) return (
        <div className="page-body">
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
                {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={100} animation="wave" />)}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Skeleton variant="rounded" height={320} animation="wave" />
                <Skeleton variant="rounded" height={320} animation="wave" />
            </Box>
        </div>
    );
    if (error) return (
        <div className="page-body">
            <MuiAlert severity="error">
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} /> {error}
            </MuiAlert>
        </div>
    );

    const compRisk = comp?.compliance_risk_score ?? 0;
    const riskColor = compRisk > 60 ? 'var(--accent-rose)' : compRisk > 35 ? 'var(--accent-amber)' : 'var(--accent-emerald)';

    const radarData = comp ? [
        { subject: 'Anomaly Rate', value: +(comp.anomaly_rate * 100).toFixed(1) },
        { subject: 'High Severity', value: +(comp.high_severity_ratio * 100).toFixed(1) },
        { subject: 'Low Confidence', value: +(comp.low_confidence_ratio * 100).toFixed(1) },
        { subject: 'Unreviewed', value: +((1 - (comp.reviewed_ratio || 0)) * 100).toFixed(1) },
    ] : [];

    const barData = fin ? [
        { name: 'Total Expenses', value: fin.total_expenses, color: '#059669' },
        { name: 'GST Liability', value: fin.total_gst_liability, color: '#3B82F6' },
        { name: 'ITC Eligible', value: fin.total_itc_eligible, color: '#6366F1' },
        { name: 'Net GST Payable', value: fin.net_gst_payable, color: '#F43F5E' },
    ] : [];

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <div className="page-breadcrumb">Analytics › KPI Reports</div>
                    <h1>KPI Reports</h1>
                </div>
            </div>

            <div className="page-body">
                {/* ── Financial KPIs ── */}
                <div className="animate-fade">
                    <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IndianRupee size={18} color="var(--accent-blue)" /> Financial KPIs
                    </h3>
                    <div className="kpi-grid">
                        {[
                            { label: 'Total Expenses', value: fmtINR(fin?.total_expenses ?? 0), color: 'var(--accent-blue)' },
                            { label: 'Total GST Liability', value: fmtINR(fin?.total_gst_liability ?? 0), color: 'var(--accent-violet)' },
                            { label: 'Total ITC Eligible', value: fmtINR(fin?.total_itc_eligible ?? 0), color: 'var(--accent-emerald)' },
                            { label: 'Net GST Payable', value: fmtINR(fin?.net_gst_payable ?? 0), color: 'var(--accent-rose)' },
                            { label: 'Effective Tax Rate', value: `${((fin?.effective_tax_rate ?? 0) * 100).toFixed(2)}%`, color: 'var(--accent-amber)' },
                            { label: 'ITC Utilization Ratio', value: `${((fin?.itc_utilization_ratio ?? 0) * 100).toFixed(1)}%`, color: 'var(--accent-cyan)' },
                        ].map((k) => (
                            <div className="kpi-card" key={k.label}>
                                <div className="kpi-label">{k.label}</div>
                                <div className="kpi-value" style={{ fontSize: '1.3rem', color: k.color }}>{k.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Financial Bar Chart ── */}
                <div className="card section-gap animate-fade">
                    <div className="card-header">
                        <span className="card-title-lg">💰 Financial Breakdown</span>
                    </div>
                    <div className="chart-container" style={{ height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }} onMouseEnter={() => setTimeout(() => setAnim(true), 100)} onMouseLeave={() => setAnim(false)}>
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} isAnimationActive={anim} />
                                <Bar dataKey="value" name="Amount (₹)" radius={[4, 4, 0, 0]}>
                                    {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Compliance KPIs ── */}
                <div className="section-gap animate-fade">
                    <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShieldCheck size={18} color="var(--accent-emerald)" /> Compliance KPIs
                    </h3>
                    <div className="grid-2">
                        <div>
                            <div className="kpi-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                {[
                                    { label: 'Total Transactions', value: comp?.total_transactions?.toLocaleString() },
                                    { label: 'Anomaly Rate', value: `${((comp?.anomaly_rate ?? 0) * 100).toFixed(2)}%`, color: 'var(--accent-rose)' },
                                    { label: 'High Severity %', value: `${((comp?.high_severity_ratio ?? 0) * 100).toFixed(2)}%`, color: 'var(--accent-orange)' },
                                    { label: 'Low Confidence %', value: `${((comp?.low_confidence_ratio ?? 0) * 100).toFixed(2)}%`, color: 'var(--accent-amber)' },
                                ].map(k => (
                                    <div className="kpi-card" key={k.label}>
                                        <div className="kpi-label">{k.label}</div>
                                        <div className="kpi-value" style={{ fontSize: '1.4rem', color: k.color }}>{k.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Risk Score */}
                            <div className="card" style={{ marginTop: 16, textAlign: 'center' }}>
                                <div className="kpi-label" style={{ marginBottom: 12 }}>Compliance Risk Score</div>
                                <div style={{
                                    fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em',
                                    color: riskColor, textShadow: `0 0 30px ${riskColor}55`
                                }}>
                                    {compRisk.toFixed(1)}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    {compRisk > 60 ? <AlertTriangle size={13} color="var(--accent-rose)" /> : compRisk > 35 ? <AlertTriangle size={13} color="var(--accent-amber)" /> : <ShieldCheck size={13} color="var(--accent-emerald)" />}
                                    <span>{compRisk > 60 ? 'High Risk' : compRisk > 35 ? 'Moderate Risk' : 'Low Risk'} / 100</span>
                                </div>
                                <div className="progress-bar-wrap" style={{ marginTop: 12 }}>
                                    <div className="progress-bar-fill" style={{ width: `${compRisk}%`, background: riskColor }} />
                                </div>
                            </div>
                        </div>

                        {/* Radar Chart */}
                        <div className="card animate-fade">
                            <div className="card-header">
                                <span className="card-title-lg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Crosshair size={18} /> Risk Radar
                                </span>
                            </div>
                            <div className="chart-container" style={{ height: 260 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={radarData}>
                                        <PolarGrid stroke="var(--border)" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                        <Radar name="Risk %" dataKey="value" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
