import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../api/auth';
import { getFinancialNews } from '../api/analytics';
import { LogIn, AlertTriangle, Loader2, Lock, Mail, BarChart2, ShieldCheck, Brain, Sun, Moon, Link } from 'lucide-react';
import { IconButton, Tooltip, Fade } from '@mui/material';
import logoUrl from '../assets/logo.svg';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passFocused, setPassFocused] = useState(false);
    const [news, setNews] = useState([]);

    // Fetch the news dynamically for the login background scatter effect
    React.useEffect(() => {
        const fetchFeeds = async () => {
            try {
                const res = await getFinancialNews();
                // Pick top 6 global feeds with highest score, skip empty
                if (res?.articles?.length > 0) {
                    const sorted = res.articles.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 6);
                    setNews(sorted);
                }
            } catch (err) { }
        };
        fetchFeeds();
    }, []);

    const [isDark, setIsDark] = useState(() => {
        return localStorage.getItem('app-theme') === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark';
    });

    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('app-theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    const toggleTheme = () => setIsDark(!isDark);

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

            <div style={{ position: 'absolute', top: 20, right: 30, zIndex: 10 }}>
                <Tooltip title="Toggle Dark Theme" arrow placement="left">
                    <IconButton
                        onClick={toggleTheme}
                        size="small"
                        sx={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            transition: 'all 0.2s',
                            '&:hover': { backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-hover)' }
                        }}
                    >
                        {isDark ? <Sun size={20} color="var(--accent-amber)" /> : <Moon size={20} color="var(--text-muted)" />}
                    </IconButton>
                </Tooltip>
            </div>

            {/* Floating News Headlines Scatter (Global Level) */}
            {news.map((item, i) => {
                const isIndian = item.tags?.includes('India');
                return (
                    <div key={i} style={{
                        position: 'absolute',
                        zIndex: 0,
                        top: i === 0 ? '10%' : i === 1 ? '85%' : i === 2 ? '48%' : i === 3 ? '15%' : i === 4 ? '82%' : '50%',
                        left: i < 3 ? (i === 0 ? '3%' : i === 1 ? '5%' : '1%') : 'auto',
                        right: i >= 3 ? (i === 3 ? '4%' : i === 4 ? '6%' : '1.5%') : 'auto',
                        '--rotation': `${i % 2 === 0 ? '-6deg' : '7deg'}`,
                        width: isIndian ? [260, 310, 360, 240, 300, 390][i % 6] : [160, 210, 260, 170, 220, 280][i % 6],
                        padding: isIndian ? '18px 22px' : '14px 16px',
                        background: isDark ? 'linear-gradient(135deg, rgba(36, 36, 36, 0.45) 0%, rgba(20, 20, 20, 0.25) 100%)' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.55) 0%, rgba(240, 240, 240, 0.25) 100%)',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(255, 255, 255, 0.4)',
                        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.7)',
                        borderLeft: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.7)',
                        borderRadius: 'var(--radius-xl)',
                        backdropFilter: 'blur(16px) saturate(120%)',
                        boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.05)' : '0 8px 32px rgba(31, 38, 135, 0.1), inset 0 0 10px rgba(255, 255, 255, 0.5)',
                        color: 'var(--text-primary)',
                        animation: `float-anim ${6 + i * 1.5}s ease-in-out infinite alternate`,
                        pointerEvents: 'none'
                    }}>
                        <div style={{ fontSize: isIndian ? '0.65rem' : '0.55rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center', textTransform: 'uppercase' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-amber)' }} />
                            {item.source}
                        </div>
                        <div style={{ fontSize: isIndian ? '0.9rem' : '0.75rem', fontWeight: 600, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: isIndian ? 4 : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.title}
                        </div>
                    </div>
                )
            })}

            <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', position: 'relative', zIndex: 1, maxWidth: 880, width: '100%', margin: '0 24px' }}>

                {/* ── Left panel: Branding & features ── */}
                <div className="glass-card" style={{
                    flex: '1 1 440px',
                    padding: '48px 40px',
                    background: isDark ? 'linear-gradient(135deg, rgba(5,150,105,0.7) 0%, rgba(16,185,129,0.5) 100%)' : 'linear-gradient(135deg, rgba(5,150,105,0.85) 0%, rgba(16,185,129,0.7) 100%)',
                    borderRadius: '16px 0 0 16px',
                    borderRight: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    color: '#fff',
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



                    <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', marginBottom: 'auto' }}>
                        {/* Logo */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-start',

                        }}>
                            <img src={logoUrl} alt="Logo" style={{ width: 70, height: 70, objectFit: 'contain' }} />
                        </div>

                        <h1 style={{
                            fontSize: '1.8rem', fontWeight: 800,
                            letterSpacing: '-0.03em', marginBottom: 8,
                            lineHeight: 1.2,
                        }}>
                            FintechAnti
                        </h1>
                        <p style={{
                            fontSize: '0.85rem', opacity: 0.85,
                            lineHeight: 1.6, marginBottom: 32,
                            color: 'rgba(255,255,255,0.85)',
                        }}>
                            Transforming Audits into Strategic Insight with Advanced Intelligence.
                        </p>

                        {/* Feature highlights */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {[
                                { icon: <Brain size={18} />, title: 'ML Classification', desc: 'Auto-classify transactions into GST slabs' },
                                { icon: <ShieldCheck size={18} />, title: 'Anomaly Detection', desc: 'Multi-signal fraud & error scoring' },
                                { icon: <BarChart2 size={18} />, title: 'Real-Time Analytics', desc: 'Dashboards, KPIs, forecasting & AI chatbot' },
                            ].map((f, i) => (
                                <div key={i} className="glass-card" style={{
                                    display: 'flex', gap: 14, alignItems: 'flex-start',
                                    padding: '12px 14px',
                                    borderRadius: 10,
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
                                        <div style={{ fontSize: '0.78rem', opacity: 0.75, lineHeight: 1.4 }}>{f.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Right panel: Login form ── */}
                <div className="glass-card" style={{
                    flex: '1 1 440px',
                    padding: '48px 40px',
                    borderRadius: '0 16px 16px 0',
                    borderLeft: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                }}>
                    <div style={{ marginBottom: 32 }}>
                        <h2 style={{
                            fontSize: '1.45rem', fontWeight: 800,
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
                            <div className={`glass-input ${emailFocused ? 'focused' : ''}`} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '0 14px',
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
                            <div className={`glass-input ${passFocused ? 'focused' : ''}`} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '0 14px',
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
