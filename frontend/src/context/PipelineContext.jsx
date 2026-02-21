import React, { createContext, useContext, useState } from 'react';

const PipelineContext = createContext(null);

export const PipelineProvider = ({ children }) => {
    const [uploadId, setUploadId] = useState(null);
    const [classificationResult, setClassificationResult] = useState(null);
    const [anomalyResult, setAnomalyResult] = useState(null);
    const [pipelineStage, setPipelineStage] = useState('idle');
    // stages: idle | uploading | classifying | classified | detecting | detected | analytics

    const reset = () => {
        setUploadId(null);
        setClassificationResult(null);
        setAnomalyResult(null);
        setPipelineStage('idle');
    };

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
