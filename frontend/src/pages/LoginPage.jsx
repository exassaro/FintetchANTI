import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../api/auth';
import { LogIn, AlertTriangle, Loader2, Shield, Lock, Mail, BarChart2, ShieldCheck, Brain } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passFocused, setPassFocused] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await loginUser(email, password);
            login(data.access_token);
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            fontFamily: "'DM Sans', sans-serif",
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Decorative background blobs — matching the green/emerald palette */}
            <div style={{
                position: 'absolute', top: '-5%', right: '-8%',
                width: 500, height: 500, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 70%)',
                filter: 'blur(60px)', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', bottom: '-10%', left: '-5%',
                width: 450, height: 450, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
                filter: 'blur(70px)', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', top: '40%', left: '50%',
                width: 350, height: 350, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)',
                filter: 'blur(50px)', pointerEvents: 'none', transform: 'translate(-50%, -50%)',
            }} />

            <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', position: 'relative', zIndex: 1, maxWidth: 900, width: '100%', margin: '0 24px' }}>

                {/* ── Left panel: Branding & features ── */}
                <div style={{
                    flex: '1 1 420px',
                    padding: '48px 40px',
                    background: 'var(--gradient-primary)',
                    borderRadius: '16px 0 0 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Subtle pattern overlay */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%)',
                        pointerEvents: 'none',
                    }} />
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.05) 0%, transparent 40%)',
                        pointerEvents: 'none',
                    }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        {/* Logo */}
                        <div style={{
                            width: 52, height: 52, borderRadius: 14,
                            background: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 24,
                            border: '1px solid rgba(255,255,255,0.15)',
                        }}>
                            <Shield size={26} color="#fff" />
                        </div>

                        <h1 style={{
                            fontSize: '1.8rem', fontWeight: 800,
                            letterSpacing: '-0.03em', marginBottom: 8,
                            lineHeight: 1.2,
                        }}>
                            GSTAnalytica
                        </h1>
                        <p style={{
                            fontSize: '0.85rem', opacity: 0.85,
                            lineHeight: 1.6, marginBottom: 36,
                            color: 'rgba(255,255,255,0.85)',
                        }}>
                            SME Audit Intelligence Platform for Indian GST compliance, anomaly detection, and financial analytics.
                        </p>

                        {/* Feature highlights */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {[
                                { icon: <Brain size={18} />, title: 'ML Classification', desc: 'Auto-classify transactions into GST slabs' },
                                { icon: <ShieldCheck size={18} />, title: 'Anomaly Detection', desc: 'Multi-signal fraud & error scoring' },
                                { icon: <BarChart2 size={18} />, title: 'Real-Time Analytics', desc: 'Dashboards, KPIs, forecasting & AI chatbot' },
                            ].map((f, i) => (
                                <div key={i} style={{
                                    display: 'flex', gap: 14, alignItems: 'flex-start',
                                    padding: '12px 14px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: 10,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    backdropFilter: 'blur(6px)',
                                }}>
                                    <div style={{
                                        width: 34, height: 34, borderRadius: 8,
                                        background: 'rgba(255,255,255,0.15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        {f.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 2 }}>{f.title}</div>
                                        <div style={{ fontSize: '0.76rem', opacity: 0.75, lineHeight: 1.4 }}>{f.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Right panel: Login form ── */}
                <div style={{
                    flex: '1 1 420px',
                    padding: '48px 40px',
                    background: 'var(--bg-card)',
                    borderRadius: '0 16px 16px 0',
                    border: '1px solid var(--border)',
                    borderLeft: 'none',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                }}>
                    <div style={{ marginBottom: 32 }}>
                        <h2 style={{
                            fontSize: '1.35rem', fontWeight: 800,
                            color: 'var(--text-primary)', letterSpacing: '-0.02em',
                            marginBottom: 6,
                        }}>
                            Welcome back
                        </h2>
                        <p style={{
                            fontSize: '0.85rem', color: 'var(--text-muted)',
                            lineHeight: 1.5,
                        }}>
                            Sign in to access your audit dashboard
                        </p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 14px', marginBottom: 20,
                            background: 'var(--accent-rose-lt)',
                            border: '1px solid var(--accent-rose-border)',
                            borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--accent-rose)',
                            fontWeight: 500,
                        }}>
                            <AlertTriangle size={15} /> {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div>
                            <label style={{
                                display: 'block', fontSize: '0.72rem', fontWeight: 700,
                                color: 'var(--text-muted)', marginBottom: 7, textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                            }}>
                                Email Address
                            </label>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '0 14px',
                                background: emailFocused ? '#fff' : 'var(--bg-glass)',
                                border: `1px solid ${emailFocused ? 'var(--accent-green)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius-md)',
                                transition: 'all 0.2s',
                                boxShadow: emailFocused ? '0 0 0 3px rgba(5,150,105,0.08)' : 'none',
                            }}>
                                <Mail size={16} color={emailFocused ? 'var(--accent-green)' : 'var(--text-muted)'} style={{ flexShrink: 0, transition: 'color 0.2s' }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    placeholder="admin@company.com"
                                    onFocus={() => setEmailFocused(true)}
                                    onBlur={() => setEmailFocused(false)}
                                    style={{
                                        width: '100%', padding: '11px 0',
                                        background: 'transparent',
                                        border: 'none', color: 'var(--text-primary)',
                                        fontSize: '0.9rem', outline: 'none',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{
                                display: 'block', fontSize: '0.72rem', fontWeight: 700,
                                color: 'var(--text-muted)', marginBottom: 7, textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                            }}>
                                Password
                            </label>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '0 14px',
                                background: passFocused ? '#fff' : 'var(--bg-glass)',
                                border: `1px solid ${passFocused ? 'var(--accent-green)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius-md)',
                                transition: 'all 0.2s',
                                boxShadow: passFocused ? '0 0 0 3px rgba(5,150,105,0.08)' : 'none',
                            }}>
                                <Lock size={16} color={passFocused ? 'var(--accent-green)' : 'var(--text-muted)'} style={{ flexShrink: 0, transition: 'color 0.2s' }} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    onFocus={() => setPassFocused(true)}
                                    onBlur={() => setPassFocused(false)}
                                    style={{
                                        width: '100%', padding: '11px 0',
                                        background: 'transparent',
                                        border: 'none', color: 'var(--text-primary)',
                                        fontSize: '0.9rem', outline: 'none',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: 4, padding: '12px 0',
                                background: loading
                                    ? 'var(--accent-green-mid)'
                                    : 'var(--gradient-primary)',
                                color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                                fontSize: '0.9rem', fontWeight: 700,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                transition: 'all 0.2s',
                                boxShadow: 'var(--shadow-green)',
                                fontFamily: 'inherit',
                            }}
                        >
                            {loading ? (
                                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
                            ) : (
                                <><LogIn size={16} /> Sign In</>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div style={{
                        marginTop: 32, textAlign: 'center',
                        fontSize: '0.72rem', color: 'var(--text-muted)',
                        lineHeight: 1.5,
                    }}>
                        Internal use only · Contact your administrator for access
                    </div>
                </div>
            </div>
        </div>
    );
}
