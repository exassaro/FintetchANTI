import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    UploadCloud, CheckCircle, AlertTriangle, Loader2,
    FileText, ChevronRight, Brain, ShieldAlert, BarChart2, X, Rocket
} from 'lucide-react';
import { usePipeline } from '../context/PipelineContext';
import { uploadCSV } from '../api/classification';
import { runAnomalyDetection } from '../api/anomaly';
import { getReviewQueue } from '../api/analytics';
import { LinearProgress, Alert as MuiAlert, Tooltip, Chip } from '@mui/material';

const PIPELINE_STEPS = [
    { id: 'upload', icon: <UploadCloud size={20} color="var(--accent-blue)" />, label: 'Upload CSV', desc: 'File validated & stored' },
    { id: 'classify', icon: <Brain size={20} color="var(--accent-indigo)" />, label: 'GST Classification', desc: 'ML model predicts GST slabs' },
    { id: 'anomaly', icon: <ShieldAlert size={20} color="var(--accent-rose)" />, label: 'Anomaly Detection', desc: 'Multi-signal scoring' },
    { id: 'analytics', icon: <BarChart2 size={20} color="var(--accent-green)" />, label: 'Analytics Ready', desc: 'Insights unlocked' },
];

export default function UploadPage() {
    const navigate = useNavigate();
    const { setUploadId, setClassificationResult, setAnomalyResult, setPipelineStage, reset } = usePipeline();
    const fileInputRef = useRef();

    const [file, setFile] = useState(null);
    const [drag, setDrag] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState(-1); // -1 = idle
    const [stepStatus, setStepStatus] = useState({}); // id -> 'active'|'done'|'error'
    const [error, setError] = useState(null);
    const [classResult, setClassResult] = useState(null);
    const [anomalyResult, setAnomalyResultLocal] = useState(null);
    const [running, setRunning] = useState(false);

    // ── Drag handlers ───────────────────────────────────────────
    const onDragOver = (e) => { e.preventDefault(); setDrag(true); };
    const onDragLeave = () => setDrag(false);
    const onDrop = (e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f && f.name.endsWith('.csv')) { setFile(f); setError(null); }
        else setError('Please upload a valid CSV file.');
    };
    const onFileChange = (e) => {
        const f = e.target.files[0];
        if (f) { setFile(f); setError(null); }
    };
    const onRemoveFile = () => setFile(null);

    // ── Step helpers ─────────────────────────────────────────────
    const markStep = (id, status) =>
        setStepStatus(prev => ({ ...prev, [id]: status }));

    // ── Run full pipeline ────────────────────────────────────────
    const runPipeline = useCallback(async () => {
        if (!file || running) return;
        reset();                    // clear old session data before new upload
        setRunning(true);
        setError(null);
        setCurrentStep(0);
        setStepStatus({});

        try {
            // ── Step 1: Upload + Classification ──────────────────────
            markStep('upload', 'active');
            setPipelineStage('uploading');
            let classData;
            try {
                classData = await uploadCSV(file, (evt) => {
                    setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
                });
                markStep('upload', 'done');
                setCurrentStep(1);
                markStep('classify', 'active');
                setPipelineStage('classifying');
            } catch (e) {
                markStep('upload', 'error');
                throw new Error(`Classification failed: ${e.response?.data?.detail || e.message}`);
            }

            // Classification is synchronous in the backend — result returned immediately
            markStep('classify', 'done');
            setClassResult(classData);
            setClassificationResult(classData);
            setUploadId(classData.upload_id);
            setPipelineStage('classified');
            setCurrentStep(2);

            // ── Step 2: Anomaly Detection ─────────────────────────────
            markStep('anomaly', 'active');
            setPipelineStage('detecting');
            let anomData;
            try {
                anomData = await runAnomalyDetection(classData.upload_id);
            } catch (e) {
                markStep('anomaly', 'error');
                throw new Error(`Anomaly detection failed: ${e.response?.data?.detail || e.message}`);
            }

            markStep('anomaly', 'done');
            setAnomalyResultLocal(anomData);
            setAnomalyResult(anomData);
            setPipelineStage('detected');
            setCurrentStep(3);
            markStep('analytics', 'done');

            // Pre-load the review queue entirely in the background so it's instantly instantly upon navigation
            try { getReviewQueue(classData.upload_id).catch(() => { }); } catch (e) { }


        } catch (err) {
            setError(err.message);
        } finally {
            setRunning(false);
        }
    }, [file, running]);

    const allDone = stepStatus['analytics'] === 'done';

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <div className="page-breadcrumb">Pipeline</div>
                    <h1>Upload & Process</h1>
                </div>
            </div>

            <div className="page-body">
                {/* ── Upload Zone ── */}
                {!running && !allDone && (
                    <div className="animate-fade">
                        <div
                            className={`upload-zone${drag ? ' drag-over' : ''}`}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            onClick={() => !file && fileInputRef.current.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                style={{ display: 'none' }}
                                onChange={onFileChange}
                            />
                            <div className="upload-zone-icon">
                                <UploadCloud size={32} color="#fff" />
                            </div>
                            <h3>Drop your transaction CSV here</h3>
                            <p>Supports GST transaction files — description, amount, vendor, category, HSN/SAC columns</p>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 16 }}>
                                <button className="btn btn-secondary" onClick={e => { e.stopPropagation(); fileInputRef.current.click(); }}>
                                    <FileText size={16} /> Browse File
                                </button>

                                {file && (
                                    <div
                                        onClick={e => e.stopPropagation()}
                                        style={{
                                            marginTop: 20,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            background: 'var(--accent-blue-lt)',
                                            border: '1px solid var(--border-accent)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '10px 16px',
                                        }}
                                    >
                                        <FileText size={18} color="var(--accent-blue)" />
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>{file.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</div>
                                        </div>
                                        <button className="btn btn-icon btn-secondary" onClick={onRemoveFile} style={{ marginLeft: 4 }}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="alert alert-error section-gap animate-fade">
                                <AlertTriangle size={18} /> {error}
                            </div>
                        )}

                        {file && (
                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                                <button className="btn btn-primary btn-lg" onClick={runPipeline} disabled={running}>
                                    <ChevronRight size={20} /> Run Full Pipeline
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Pipeline Visualizer ── */}
                {(running || allDone) && (
                    <div className="card animate-fade" style={{ marginTop: file && !running ? 24 : 0 }}>
                        <div className="card-header">
                            <span className="card-title-lg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Rocket size={18} /> Processing Pipeline</span>
                            {running && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-blue)', fontSize: '0.82rem' }}>
                                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                                    Running…
                                </div>
                            )}
                            {allDone && <span className="chip chip-green"><CheckCircle size={12} /> Complete</span>}
                        </div>

                        {/* Visual pipeline */}
                        <div className="pipeline-viz">
                            {PIPELINE_STEPS.map((step, i) => {
                                const status = stepStatus[step.id] || 'idle';
                                return (
                                    <React.Fragment key={step.id}>
                                        <div className={`pipeline-node ${status}`}>
                                            <div className="pipeline-node-circle">
                                                <div className={status === 'active' ? 'icon-pulse' : ''} style={{ display: 'flex', zIndex: 2 }}>
                                                    {step.icon}
                                                </div>

                                                {status === 'active' && (
                                                    <Loader2 size={56} color="var(--accent-blue)" style={{ position: 'absolute', animation: 'spin 2s linear infinite', opacity: 0.25 }} />
                                                )}
                                                {status === 'done' && (
                                                    <div style={{ position: 'absolute', top: -3, right: -3, background: 'var(--bg-primary)', borderRadius: '50%', padding: 2, display: 'flex' }}>
                                                        <CheckCircle size={14} color="var(--accent-green)" />
                                                    </div>
                                                )}
                                                {status === 'error' && (
                                                    <div style={{ position: 'absolute', top: -3, right: -3, background: 'var(--bg-primary)', borderRadius: '50%', padding: 2, display: 'flex' }}>
                                                        <AlertTriangle size={14} color="var(--accent-rose)" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="pipeline-node-label">{step.label}</div>
                                        </div>
                                        {i < PIPELINE_STEPS.length - 1 && (
                                            <div className={`pipeline-connector ${stepStatus[step.id] === 'done' ? 'done' : ''} ${stepStatus[step.id] === 'active' ? 'active' : ''}`} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Upload progress */}
                        {stepStatus['upload'] === 'active' && (
                            <div style={{ marginTop: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                                    <span>Uploading file…</span><span>{uploadProgress}%</span>
                                </div>
                                <div className="progress-bar-wrap">
                                    <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="alert alert-error" style={{ marginTop: 16 }}>
                                <AlertTriangle size={18} /> {error}
                            </div>
                        )}

                        {/* Results Summary */}
                        {classResult && (
                            <div style={{ marginTop: 20 }}>
                                <div className="card-title" style={{ marginBottom: 12 }}>Classification Result</div>
                                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                                    <div className="card-glass">
                                        <div className="kpi-label">Upload ID</div>
                                        <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-accent)', wordBreak: 'break-all' }}>
                                            {classResult.upload_id}
                                        </div>
                                    </div>
                                    <div className="card-glass">
                                        <div className="kpi-label">Schema Detected</div>
                                        <div className="kpi-value" style={{ fontSize: '1.6rem' }}>{classResult.schema}</div>
                                    </div>
                                    <div className="card-glass">
                                        <div className="kpi-label">Rows Classified</div>
                                        <div className="kpi-value" style={{ fontSize: '1.6rem' }}>{classResult.rows_processed?.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {anomalyResult && (
                            <div style={{ marginTop: 16 }}>
                                <div className="card-title" style={{ marginBottom: 12 }}>Anomaly Detection Result</div>
                                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                                    <div className="card-glass">
                                        <div className="kpi-label">Total Records</div>
                                        <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{anomalyResult.total_records?.toLocaleString()}</div>
                                    </div>
                                    <div className="card-glass">
                                        <div className="kpi-label">Anomalies Found</div>
                                        <div className="kpi-value" style={{ fontSize: '1.4rem', color: 'var(--accent-rose)' }}>{anomalyResult.anomaly_count}</div>
                                    </div>
                                    <div className="card-glass">
                                        <div className="kpi-label">Avg. Score</div>
                                        <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{anomalyResult.avg_anomaly_score?.toFixed(3)}</div>
                                    </div>
                                    <div className="card-glass">
                                        <div className="kpi-label">Threshold Used</div>
                                        <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{anomalyResult.threshold_used?.toFixed(3)}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {allDone && (
                            <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary" onClick={() => { setFile(null); setStepStatus({}); setCurrentStep(-1); setClassResult(null); setAnomalyResultLocal(null); setRunning(false); }}>
                                    Upload Another File
                                </button>
                                <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
                                    <BarChart2 size={18} /> View Analytics Dashboard
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Info Cards ── */}
                {!running && !allDone && !file && (
                    <div className="grid-3 section-gap animate-fade">
                        {[
                            { icon: <Brain size={38} color="var(--accent-indigo)" />, title: 'Smart Classification', desc: 'ML models trained on Indian B2B GST transactions classify each row into GST slabs (0%, 5%, 18%, 40%) or HSN/SAC codes.' },
                            { icon: <ShieldAlert size={38} color="var(--accent-rose)" />, title: 'Multi-Signal Anomaly Detection', desc: 'IsolationForest + Autoencoder + NLP clustering + confidence scoring detect suspicious transactions with adaptive thresholds.' },
                            { icon: <BarChart2 size={38} color="var(--accent-green)" />, title: 'Real-Time Analytics', desc: 'Instant dashboards, KPI reports, GST forecasting, compliance scoring, and AI-powered natural language queries.' },
                        ].map(c => (
                            <div className="card" key={c.title} style={{ textAlign: 'center', padding: '32px 24px' }}>
                                <div style={{ fontSize: '2.2rem', marginBottom: 14 }}>{c.icon}</div>
                                <h3 style={{ marginBottom: 10, fontSize: '1rem' }}>{c.title}</h3>
                                <p style={{ fontSize: '0.82rem', lineHeight: 1.65 }}>{c.desc}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
