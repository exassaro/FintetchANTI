import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, Bot, User, AlertTriangle, Sparkles } from 'lucide-react';
import { usePipeline } from '../context/PipelineContext';
import { sendChatbotQuery } from '../api/analytics';

const SUGGESTIONS = [
    'What is the total GST liability?',
    'List the top 5 vendors by spend',
    'Which transactions have the highest anomaly score?',
    'What is the effective tax rate?',
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
            content: "Hello! I'm your GST Financial Audit Assistant 🇮🇳. Ask me anything about your transactions — anomalies, GST liabilities, compliance metrics, or specific vendors.",
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
                content: `⚠️ ${e.response?.data?.detail || e.message}`,
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <div className="page-header" style={{ flexShrink: 0 }}>
                <div className="page-header-left">
                    <div className="page-breadcrumb">Review & AI › AI Chatbot</div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Bot size={26} color="var(--accent-indigo)" /> AI Chatbot
                    </h1>
                </div>
                <div className="chip chip-green" style={{ marginTop: 14 }}><Sparkles size={11} /> Powered by LLM</div>
            </div>

            <div className="page-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>
                    {/* Chat Panel */}
                    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', gap: 10
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: 'var(--gradient-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Bot size={18} color="#fff" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>GST Audit Assistant</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 5px rgba(5,150,105,0.6)' }} />
                                    Online · Upload ID: {uploadId?.slice(0, 8)}…
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {messages.map((msg, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                            background: msg.role === 'user' ? 'rgba(99,102,241,0.2)' : 'var(--gradient-primary)',
                                            border: msg.role === 'user' ? '1px solid rgba(99,102,241,0.3)' : 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {msg.role === 'user' ? <User size={14} color="var(--accent-indigo)" /> : <Bot size={14} color="#fff" />}
                                        </div>
                                        <div
                                            className={`chat-bubble ${msg.role}`}
                                            style={msg.isError ? { borderColor: 'var(--accent-rose)', background: 'rgba(244,63,94,0.08)' } : {}}
                                        >
                                            {msg.content}
                                            {msg.intent && (
                                                <div style={{ marginTop: 6 }}>
                                                    <span className="chip chip-violet" style={{ fontSize: '0.6rem' }}>intent: {msg.intent}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="chat-meta" style={{ marginInline: 36 }}>{formatTime(msg.time)}</div>
                                </div>
                            ))}

                            {loading && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Bot size={14} color="#fff" />
                                    </div>
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
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
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
                                <button
                                    className="btn btn-primary"
                                    onClick={() => sendMessage(input)}
                                    disabled={loading || !input.trim()}
                                    style={{ flexShrink: 0 }}
                                >
                                    {loading ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={17} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Suggestions Sidebar */}
                    <div style={{ width: 220, flexShrink: 0 }}>
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                💡 Suggested Queries
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', padding: '8px' }}>
                                {SUGGESTIONS.map((s, i) => (
                                    <button
                                        key={i}
                                        className="btn btn-secondary btn-sm"
                                        style={{ textAlign: 'left', justifyContent: 'flex-start', marginBottom: 4, height: 'auto', padding: '8px 12px', fontSize: '0.78rem', whiteSpace: 'normal', lineHeight: 1.4 }}
                                        onClick={() => sendMessage(s)}
                                        disabled={loading}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
