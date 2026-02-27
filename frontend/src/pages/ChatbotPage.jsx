import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, Bot, User, Sparkles, Lightbulb, AlertTriangle } from 'lucide-react';
import { usePipeline } from '../context/PipelineContext';
import { sendChatbotQuery } from '../api/analytics';
import {
    Avatar, Chip, IconButton, Tooltip, Paper, Typography,
    Box, Fade, Grow
} from '@mui/material';
import logoUrl from '../assets/logogreen.svg';

const SUGGESTIONS = [
    'What is the total GST liability?',
    'List the top 5 vendors by spend',
    'Which transactions have the highest anomaly score?',
    'How many low confidence transactions are there?',
    'Show me the GST slab distribution',
];

const formatTime = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export default function ChatbotPage() {
    const { uploadId } = usePipeline();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            content: "Hello! I'm Auri, your AI Audit Assistant. Ask me anything about your transactions anomalies, GST liabilities, compliance metrics, or specific vendors.",
            time: new Date(),
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef();
    const inputRef = useRef();

    useEffect(() => {
        if (!uploadId) { navigate('/'); }
    }, [uploadId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (query) => {
        if (!query.trim() || loading) return;
        const userMsg = { role: 'user', content: query, time: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await sendChatbotQuery(uploadId, query);
            const botMsg = {
                role: 'bot',
                content: res.response || res.answer || JSON.stringify(res),
                intent: res.intent,
                time: new Date(),
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (e) {
            setMessages(prev => [...prev, {
                role: 'bot',
                content: e.response?.data?.detail || e.message,
                time: new Date(),
                isError: true,
            }]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 53px)' }}>
            <div className="page-header" style={{ flexShrink: 0 }}>
                <div className="page-header-left">
                    <div className="page-breadcrumb">Review & AI › AI Chatbot</div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar sx={{
                            width: 32, height: 32,
                            background: 'linear-gradient(135deg, #059669, #10B981)',
                            boxShadow: '0 4px 12px rgba(5,150,105,0.25)',
                        }}>
                            <Bot size={18} color="#fff" />
                        </Avatar>
                        AI Chatbot
                    </h1>
                </div>
                <Chip
                    icon={<Sparkles size={12} />}
                    label="Powered by LLM"
                    size="small"
                    sx={{
                        mt: 1.5,
                        background: 'var(--accent-green-lt)', color: 'var(--text-primary)',
                        border: '1px solid var(--accent-green-border)',
                        fontWeight: 600, fontSize: '0.72rem',
                        '& .MuiChip-icon': { color: 'var(--accent-green)' },
                    }}
                />
            </div>

            <div className="page-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, padding: '22px 30px', minHeight: 0 }}>
                <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>
                    {/* Chat Panel */}
                    <Paper
                        elevation={0}
                        sx={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            overflow: 'hidden',
                            border: '1px solid var(--border)',
                            borderRadius: 3,
                            background: 'var(--bg-primary)',
                        }}
                    >
                        {/* Header */}
                        <Box sx={{
                            p: '16px 20px',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', gap: 1.2,
                        }}>
                            <Avatar sx={{
                                width: 38, height: 38,
                                background: 'transparent',
                            }}>
                                <img src={logoUrl} alt="Auri Logo" style={{ width: 38, height: 38, objectFit: 'contain' }} />
                            </Avatar>
                            <div>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                                    Auri
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{
                                        width: 7, height: 7, borderRadius: '50%',
                                        background: 'var(--accent-green)',
                                        boxShadow: '0 0 6px var(--accent-green-lt)',
                                    }} />
                                    <Typography variant="caption" sx={{ color: 'var(--accent-green)', fontWeight: 500, fontSize: '0.72rem' }}>
                                        Online · Upload ID: {uploadId?.slice(0, 8)}…
                                    </Typography>
                                </Box>
                            </div>
                        </Box>

                        {/* Messages */}
                        <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.8 }}>
                            {messages.map((msg, i) => (
                                <Grow in key={i} timeout={300 + i * 50}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                            <Avatar sx={{
                                                width: 30, height: 30,
                                                background: msg.role === 'user'
                                                    ? 'rgba(99,102,241,0.15)'
                                                    : 'transparent',
                                                border: msg.role === 'user' ? '1px solid rgba(99,102,241,0.25)' : 'none',
                                            }}>
                                                {msg.role === 'user'
                                                    ? <User size={14} color="#6366F1" />
                                                    : <img src={logoUrl} alt="Auri Logo" className="auri-anim" style={{ width: 30, height: 30, objectFit: 'contain' }} />
                                                }
                                            </Avatar>
                                            <div
                                                className={`chat-bubble ${msg.role}`}
                                                style={msg.isError ? { borderColor: 'var(--accent-rose)', background: 'rgba(244,63,94,0.06)' } : {}}
                                            >
                                                {msg.isError && <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: 'var(--accent-rose)' }} />}
                                                {typeof msg.content === 'string' ? msg.content.split('\n').map((line, k) => (
                                                    <React.Fragment key={k}>
                                                        {line}
                                                        {k < msg.content.split('\n').length - 1 && <br />}
                                                    </React.Fragment>
                                                )) : msg.content}
                                                {msg.intent && (
                                                    <Box sx={{ mt: 0.8 }}>
                                                        <Chip
                                                            label={`intent: ${msg.intent}`}
                                                            size="small"
                                                            sx={{
                                                                height: 18, fontSize: '0.6rem',
                                                                background: '#F5F3FF', color: '#8B5CF6',
                                                                border: '1px solid #DDD6FE',
                                                                fontWeight: 600,
                                                                '& .MuiChip-label': { px: 0.6 },
                                                            }}
                                                        />
                                                    </Box>
                                                )}
                                            </div>
                                        </div>
                                        <div className="chat-meta" style={{ marginInline: 36 }}>{formatTime(msg.time)}</div>
                                    </div>
                                </Grow>
                            ))}

                            {loading && (
                                <Fade in>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Avatar sx={{
                                            width: 30, height: 30,
                                            background: 'transparent',
                                        }}>
                                            <img src={logoUrl} alt="Auri Logo" className="auri-anim" style={{ width: 30, height: 30, objectFit: 'contain' }} />
                                        </Avatar>
                                        <div className="chat-bubble bot" style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {[0, 1, 2].map(i => (
                                                    <div key={i} style={{
                                                        width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-indigo)',
                                                        animation: `pulse-dot 1.2s ${i * 0.2}s infinite`
                                                    }} />
                                                ))}
                                            </div>
                                            Thinking…
                                        </div>
                                    </div>
                                </Fade>
                            )}
                            <div ref={bottomRef} />
                        </Box>

                        {/* Input */}
                        <Box sx={{
                            p: '14px 20px', borderTop: '1px solid var(--border)',
                            background: 'var(--bg-card)',
                        }}>
                            <div className="chat-input-row">
                                <textarea
                                    ref={inputRef}
                                    className="input-field"
                                    style={{ resize: 'none', height: 44, lineHeight: '1.5' }}
                                    placeholder="Ask anything about your GST data…"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={onKeyDown}
                                    rows={1}
                                />
                                <Tooltip title={loading ? 'Processing…' : 'Send message'} arrow>
                                    <span>
                                        <IconButton
                                            onClick={() => sendMessage(input)}
                                            disabled={loading || !input.trim()}
                                            sx={{
                                                background: 'linear-gradient(135deg, #059669, #10B981)',
                                                color: '#fff',
                                                width: 42, height: 42,
                                                boxShadow: '0 2px 8px rgba(5,150,105,0.2)',
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #047857, #059669)',
                                                    boxShadow: '0 4px 14px rgba(5,150,105,0.3)',
                                                    transform: 'translateY(-1px)',
                                                },
                                                '&:disabled': {
                                                    background: '#E2E8F0', color: '#94A3B8',
                                                    boxShadow: 'none',
                                                },
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {loading ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={17} />}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </div>
                        </Box>
                    </Paper>

                    {/* Suggestions Sidebar */}
                    <Paper
                        elevation={0}
                        sx={{
                            width: 230, flexShrink: 0,
                            border: '1px solid var(--border)',
                            background: 'var(--bg-primary)',
                            borderRadius: 3,
                            overflow: 'hidden',
                            display: 'flex', flexDirection: 'column',
                        }}
                    >
                        <Box sx={{
                            p: '14px 16px',
                            borderBottom: '1px solid var(--border)',
                            background: 'var(--bg-secondary)',
                        }}>
                            <Typography variant="subtitle2" sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Lightbulb size={14} /> Suggested Queries
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', p: 1, gap: 0.5, overflow: 'auto', flex: 1 }}>
                            {SUGGESTIONS.map((s, i) => (
                                <Tooltip key={i} title="Click to send this query" arrow placement="left">
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        style={{
                                            textAlign: 'left', justifyContent: 'flex-start',
                                            height: 'auto', padding: '10px 12px',
                                            fontSize: '0.78rem', whiteSpace: 'normal', lineHeight: 1.4,
                                            borderRadius: 8,
                                        }}
                                        onClick={() => sendMessage(s)}
                                        disabled={loading}
                                    >
                                        {s}
                                    </button>
                                </Tooltip>
                            ))}
                        </Box>
                    </Paper>
                </div>
            </div>
        </div>
    );
}
