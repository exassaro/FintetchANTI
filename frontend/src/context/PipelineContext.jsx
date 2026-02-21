import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PipelineContext = createContext(null);

const STORAGE_KEY = 'gst_pipeline_session';

/**
 * Read the persisted pipeline session from sessionStorage.
 * Returns an object with uploadId, classificationResult, anomalyResult, pipelineStage.
 */
function loadSession() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch {
        /* corrupted – ignore */
    }
    return null;
}

/**
 * Write the current pipeline state to sessionStorage.
 */
function saveSession(state) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        /* storage full – best effort */
    }
}

/**
 * Remove the pipeline session from sessionStorage.
 * Called on signout or new CSV upload.
 */
export function clearPipelineSession() {
    sessionStorage.removeItem(STORAGE_KEY);
}

export const PipelineProvider = ({ children }) => {
    const saved = loadSession();

    const [uploadId, setUploadIdRaw] = useState(saved?.uploadId ?? null);
    const [classificationResult, setClassificationResultRaw] = useState(saved?.classificationResult ?? null);
    const [anomalyResult, setAnomalyResultRaw] = useState(saved?.anomalyResult ?? null);
    const [pipelineStage, setPipelineStageRaw] = useState(saved?.pipelineStage ?? 'idle');
    // stages: idle | uploading | classifying | classified | detecting | detected | analytics

    // Wrap every setter so it also persists to sessionStorage
    const persist = useCallback((patch) => {
        // We read the current values from sessionStorage to merge correctly,
        // but for simplicity we keep an up-to-date ref via the patch pattern.
        const current = loadSession() || {};
        saveSession({ ...current, ...patch });
    }, []);

    const setUploadId = useCallback((v) => {
        setUploadIdRaw(v);
        persist({ uploadId: v });
    }, [persist]);

    const setClassificationResult = useCallback((v) => {
        setClassificationResultRaw(v);
        persist({ classificationResult: v });
    }, [persist]);

    const setAnomalyResult = useCallback((v) => {
        setAnomalyResultRaw(v);
        persist({ anomalyResult: v });
    }, [persist]);

    const setPipelineStage = useCallback((v) => {
        setPipelineStageRaw(v);
        persist({ pipelineStage: v });
    }, [persist]);

    const reset = useCallback(() => {
        setUploadIdRaw(null);
        setClassificationResultRaw(null);
        setAnomalyResultRaw(null);
        setPipelineStageRaw('idle');
        clearPipelineSession();
    }, []);

    return (
        <PipelineContext.Provider value={{
            uploadId, setUploadId,
            classificationResult, setClassificationResult,
            anomalyResult, setAnomalyResult,
            pipelineStage, setPipelineStage,
            reset,
        }}>
            {children}
        </PipelineContext.Provider>
    );
};

export const usePipeline = () => {
    const ctx = useContext(PipelineContext);
    if (!ctx) throw new Error('usePipeline must be used inside PipelineProvider');
    return ctx;
};
