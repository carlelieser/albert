import { useState, useCallback, useRef } from 'react';
import { config } from '../../config';

export interface Stats {
    tokenCount: number;
    responseTime: number;
    isProcessing: boolean;
    modelName: string;
    sessionId: string | null;
}

interface UseStatsReturn {
    stats: Stats;
    startProcessing: () => void;
    finishProcessing: (tokens?: number) => void;
    setModelName: (name: string) => void;
    setSessionId: (id: string | null) => void;
    addTokens: (count: number) => void;
    reset: () => void;
}

export function useStats(): UseStatsReturn {
    const [stats, setStats] = useState<Stats>({
        tokenCount: 0,
        responseTime: 0,
        isProcessing: false,
        modelName: config.ollama.models.main,
        sessionId: null,
    });

    const processingStartRef = useRef<number>(0);

    const startProcessing = useCallback(() => {
        processingStartRef.current = Date.now();
        setStats(prev => ({ ...prev, isProcessing: true }));
    }, []);

    const finishProcessing = useCallback((tokens?: number) => {
        // Only calculate elapsed time if processing was started
        const elapsed = processingStartRef.current > 0
            ? Date.now() - processingStartRef.current
            : 0;
        processingStartRef.current = 0; // Reset for next request
        setStats(prev => ({
            ...prev,
            isProcessing: false,
            responseTime: elapsed,
            tokenCount: tokens !== undefined ? tokens : prev.tokenCount,
        }));
    }, []);

    const setModelName = useCallback((name: string) => {
        setStats(prev => ({ ...prev, modelName: name }));
    }, []);

    const setSessionId = useCallback((id: string | null) => {
        setStats(prev => ({ ...prev, sessionId: id }));
    }, []);

    const addTokens = useCallback((count: number) => {
        setStats(prev => ({ ...prev, tokenCount: prev.tokenCount + count }));
    }, []);

    const reset = useCallback(() => {
        setStats({
            tokenCount: 0,
            responseTime: 0,
            isProcessing: false,
            modelName: config.ollama.models.main,
            sessionId: null,
        });
    }, []);

    return {
        stats,
        startProcessing,
        finishProcessing,
        setModelName,
        setSessionId,
        addTokens,
        reset,
    };
}
