import React, { useEffect, useState } from 'react';
import { getFinancialNews } from '../api/analytics';
import { Globe, ArrowUpRight, Clock, Loader2, AlertTriangle, TrendingUp, Zap, Newspaper } from 'lucide-react';
import { Chip, Box, Tooltip, Fade, Grow, ToggleButtonGroup, ToggleButton } from '@mui/material';

export default function NewsPage() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');

    const displayNews = news.filter(item => {
        if (filter === 'india') return item.tags?.includes('India');
        if (filter === 'world') return !item.tags?.includes('India');
        return true;
    });

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await getFinancialNews();
                setNews(res.articles || []);
            } catch (err) {
                setError(err.response?.data?.detail || err.message || "Failed to load news");
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <Loader2 size={36} color="var(--accent-blue)" style={{ animation: 'spin 1s linear infinite' }} />
                    <div style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Fetching latest global financial feeds…</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-body">
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '16px 20px', background: 'var(--accent-rose-lt)',
                    border: '1px solid var(--accent-rose-border)', borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-rose)', fontWeight: 500
                }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <div className="page-breadcrumb">Pipeline › Live News</div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Globe size={22} color="var(--accent-blue)" /> Global Financial Feed
                    </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <ToggleButtonGroup
                        value={filter}
                        exclusive
                        onChange={(e, newVal) => newVal && setFilter(newVal)}
                        size="small"
                        sx={{
                            backgroundColor: 'var(--bg-glass)',
                            borderRadius: 'var(--radius-md)',
                            padding: 0.5,
                            '& .MuiToggleButton-root': {
                                color: 'var(--text-muted)', border: 'none', borderRadius: 'var(--radius-sm)',
                                px: 1.5, py: 0.5, fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
                                transition: 'all 0.2s',
                                '&.Mui-selected': { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' },
                                '&:hover': { color: 'var(--text-primary)' }
                            }
                        }}
                    >
                        <ToggleButton value="all">All</ToggleButton>
                        <ToggleButton value="india">India</ToggleButton>
                        <ToggleButton value="world">World</ToggleButton>
                    </ToggleButtonGroup>
                    <Chip
                        icon={<Zap size={14} />}
                        label={`${displayNews.length} Articles`}
                        size="small"
                        sx={{
                            background: 'var(--accent-amber-lt)', color: 'var(--text-primary)',
                            border: '1px solid var(--accent-amber-border)', fontWeight: 600,
                            '& .MuiChip-icon': { color: 'var(--accent-amber)' },
                        }}
                    />
                </div>
            </div>

            <div className="page-body">
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 20
                }}>
                    {displayNews.map((item, index) => (
                        <Fade in key={item.url || index} timeout={(index % 10) * 150 + 300}>
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ textDecoration: 'none', display: 'block', height: '100%' }}
                            >
                                <div className="card" style={{
                                    height: '100%', display: 'flex', flexDirection: 'column',
                                    transition: 'all 0.2s', cursor: 'pointer',
                                    position: 'relative', overflow: 'hidden'
                                }}>
                                    {/* Hover overlay highlight */}
                                    <div className="news-hover-bg" style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                                        background: item.relevance_score >= 3 ? 'var(--gradient-danger)' : 'var(--gradient-primary)',
                                        opacity: 0.8
                                    }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, marginTop: 4 }}>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <span className="chip" style={{
                                                fontSize: '0.62rem', background: 'var(--bg-glass)',
                                                border: '1px solid var(--border)', color: 'var(--text-secondary)'
                                            }}>
                                                {item.source}
                                            </span>
                                            {item.tags?.map(tag => (
                                                <span key={tag} className="chip" style={{
                                                    fontSize: '0.6rem', padding: '2px 6px',
                                                    background: tag === 'GST' ? 'var(--accent-rose-lt)'
                                                        : tag === 'Tax' ? 'var(--accent-amber-lt)'
                                                            : 'var(--accent-blue-lt)',
                                                    color: tag === 'GST' ? 'var(--accent-rose)'
                                                        : tag === 'Tax' ? 'var(--accent-amber)'
                                                            : 'var(--accent-blue)',
                                                    border: 'none', fontWeight: 700
                                                }}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <ArrowUpRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                    </div>

                                    <h3 style={{
                                        fontSize: '1.05rem', fontWeight: 700,
                                        lineHeight: 1.4, color: 'var(--text-primary)',
                                        marginBottom: 10,
                                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                    }}>
                                        {item.title}
                                    </h3>

                                    <p style={{
                                        fontSize: '0.82rem', color: 'var(--text-secondary)',
                                        lineHeight: 1.6, flex: 1,
                                        display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                    }}>
                                        {item.summary || "No summary provided by source."}
                                    </p>

                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        marginTop: 18, paddingTop: 14,
                                        borderTop: '1px solid var(--border)',
                                        fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500
                                    }}>
                                        <Clock size={12} />
                                        {formatDate(item.published_at)}

                                        {item.relevance_score > 0 && (
                                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <TrendingUp size={12} color="var(--accent-green)" />
                                                <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Score: {item.relevance_score}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </a>
                        </Fade>
                    ))}
                </div>
            </div>
        </div>
    );
}
