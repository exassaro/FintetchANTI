import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart2, Users, Building2, FolderOpen } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
    ResponsiveContainer, PieChart, Pie, Legend
} from 'recharts';
import { usePipeline } from '../context/PipelineContext';
import { getVendorDistribution, getCategoryDistribution } from '../api/analytics';
import { Skeleton, Box } from '@mui/material';

const COLORS = ['#059669', '#3B82F6', '#F59E0B', '#8B5CF6', '#F43F5E', '#06B6D4', '#6366F1', '#10B981', '#FB923C', '#A855F7'];

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
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.82rem', boxShadow: 'var(--shadow-md)' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>{label}</p>
            {payload.filter(p => p.value != null).map(p => <p key={p.name} style={{ color: p.color || p.payload.fill }}>{p.name}: <strong>{p.value > 100 ? fmtINR(p.value) : p.value}</strong></p>)}
        </div>
    );
};

export default function DistributionPage() {
    const { uploadId } = usePipeline();
    const navigate = useNavigate();
    const [topN, setTopN] = useState(10);
    const [vendors, setVendors] = useState(null);
    const [categories, setCategories] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [anim, setAnim] = useState(false);

    useEffect(() => {
        if (!uploadId) { navigate('/'); return; }
        setLoading(true);
        Promise.all([getVendorDistribution(uploadId, topN), getCategoryDistribution(uploadId, topN)])
            .then(([v, c]) => {
                setVendors(v);
                setCategories(c);
                setError(null);
            })
            .catch(e => setError(e.response?.data?.detail || e.response?.data || e.message))
            .finally(() => setLoading(false));
    }, [uploadId, topN]);

    const vendorData = vendors?.data?.map(v => ({ name: v.vendor_name, value: v.total_spend })) || [];

    const catData = categories?.data?.map(c => ({ name: c.category, value: c.total_spend })) || [];

    if (loading) return (
        <div className="page-body">
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Skeleton variant="rounded" height={350} animation="wave" />
                <Skeleton variant="rounded" height={350} animation="wave" />
            </Box>
        </div>
    );

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <div className="page-breadcrumb">Analytics › Distribution</div>
                    <h1>Distribution Analysis</h1>
                </div>
                <select className="input-field" style={{ width: 120, marginTop: 8 }} value={topN} onChange={e => setTopN(Number(e.target.value))}>
                    {[5, 10, 15, 20].map(n => <option key={n} value={n}>Top {n}</option>)}
                </select>
            </div>

            <div className="page-body">
                {error && <div className="alert alert-error animate-fade"><AlertTriangle size={18} /> {error}</div>}

                <div className="grid-2">
                    {/* Vendor Distribution */}
                    <div className="card animate-fade">
                        <div className="card-header">
                            <span className="card-title-lg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Building2 size={18} /> Top Vendors by Spend</span>
                            <span className="chip chip-blue">Top {topN}</span>
                        </div>
                        {vendorData.length > 0 ? (
                            <div className="chart-container" style={{ height: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={vendorData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }} onMouseEnter={() => setTimeout(() => setAnim(true), 100)} onMouseLeave={() => setAnim(false)}>
                                        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={120} />
                                        <Tooltip content={<CustomTooltip />} isAnimationActive={anim} />
                                        <Bar dataKey="value" name="Spend (₹)" radius={[0, 4, 4, 0]}>
                                            {vendorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="chart-container" style={{ height: 350, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                                <Building2 size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                                <h3>No vendor data</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Your CSV may not have a vendor_name column.</p>
                            </div>
                        )}
                    </div>

                    {/* Category Distribution */}
                    <div className="card animate-fade">
                        <div className="card-header">
                            <span className="card-title-lg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FolderOpen size={18} /> Top Categories by Spend</span>
                            <span className="chip chip-violet">Top {topN}</span>
                        </div>
                        {catData.length > 0 ? (
                            <div className="chart-container" style={{ height: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart onMouseEnter={() => setTimeout(() => setAnim(true), 100)} onMouseLeave={() => setAnim(false)}>
                                        <Pie data={catData} cx="50%" cy="50%" outerRadius={110} dataKey="value" nameKey="name">
                                            {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} isAnimationActive={anim} />
                                        <Legend formatter={(v) => <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{v}</span>} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="chart-container" style={{ height: 350, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                                <FolderOpen size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                                <h3>No category data</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Your CSV may not have a category column.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tables */}
                {vendorData.length > 0 && (
                    <div className="card section-gap animate-fade">
                        <div className="card-header">
                            <span className="card-title-lg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Users size={18} /> Vendor Details
                            </span>
                        </div>
                        <div className="table-wrap">
                            <table>
                                <thead><tr><th>#</th><th>Vendor</th><th>Total Spend</th><th>Share</th></tr></thead>
                                <tbody>
                                    {vendorData.map((v, i) => {
                                        const total = vendorData.reduce((s, d) => s + d.value, 0);
                                        return (
                                            <tr key={i}>
                                                <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v.name}</td>
                                                <td style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{fmtINR(v.value)}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div className="progress-bar-wrap" style={{ flex: 1, height: 4 }}>
                                                            <div className="progress-bar-fill" style={{ width: `${(v.value / total * 100).toFixed(0)}%`, background: COLORS[i % COLORS.length] }} />
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(v.value / total * 100).toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
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
