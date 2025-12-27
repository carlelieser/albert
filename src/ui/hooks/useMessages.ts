import { useState, useCallback } from 'react';

export interface MemoryAnnotationData {
    entryCount: number;
}

export interface KnowledgeAnnotationData {
    factCount: number;
    similarities: number[];
}

export interface PersonalityAnnotationData {
    traits: {
        warmth: number;
        verbosity: number;
        formality: number;
        humor: number;
        confidence: number;
    };
}

export interface ThinkingAnnotationData {
    model: string;
}

export type AnnotationData =
    | MemoryAnnotationData
    | KnowledgeAnnotationData
    | PersonalityAnnotationData
    | ThinkingAnnotationData;

export type AnnotationType = 'memory' | 'knowledge' | 'personality' | 'thinking';

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool' | 'annotation';
    content: string;
    timestamp: number;
    isStreaming: boolean;
    toolName?: string;
    toolArgs?: Record<string, unknown>;
    toolSuccess?: boolean;
    toolExecutionMs?: number;
    annotationType?: AnnotationType;
    annotationData?: AnnotationData;
}

interface UseMessagesReturn {
    messages: Message[];
    currentStreamingId: string | null;
    addUserMessage: (content: string) => string;
    startAssistantMessage: () => string;
    appendToStreaming: (text: string) => void;
    finishStreaming: (finalContent?: string) => void;
    addToolMessage: (toolName: string, toolArgs: Record<string, unknown>) => string;
    completeToolMessage: (id: string, result: { success: boolean; output: string; executionMs: number }) => void;
    addAnnotation: (annotationType: AnnotationType, content: string, annotationData: AnnotationData) => string;
    clearMessages: () => void;
}

let messageIdCounter = 0;

function generateId(): string {
    return `msg_${Date.now()}_${messageIdCounter++}`;
}

export function useMessages(): UseMessagesReturn {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(null);

    const addUserMessage = useCallback((content: string): string => {
        const id = generateId();
        const message: Message = {
            id,
            role: 'user',
            content,
            timestamp: Date.now(),
            isStreaming: false,
        };
        setMessages(prev => [...prev, message]);
        return id;
    }, []);

    const startAssistantMessage = useCallback((): string => {
        const id = generateId();
        const message: Message = {
            id,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            isStreaming: true,
        };
        setMessages(prev => [...prev, message]);
        setCurrentStreamingId(id);
        return id;
    }, []);

    const appendToStreaming = useCallback((text: string) => {
        setMessages(prev => prev.map(msg => {
            if (msg.isStreaming) {
                return { ...msg, content: msg.content + text };
            }
            return msg;
        }));
    }, []);

    const finishStreaming = useCallback((finalContent?: string) => {
        setMessages(prev => prev.map(msg => {
            if (msg.isStreaming) {
                return {
                    ...msg,
                    content: finalContent ?? msg.content,
                    isStreaming: false,
                };
            }
            return msg;
        }));
        setCurrentStreamingId(null);
    }, []);

    const addToolMessage = useCallback((
        toolName: string,
        toolArgs: Record<string, unknown>
    ): string => {
        const id = generateId();
        const message: Message = {
            id,
            role: 'tool',
            content: 'Executing...',
            timestamp: Date.now(),
            isStreaming: true,
            toolName,
            toolArgs,
        };
        setMessages(prev => [...prev, message]);
        return id;
    }, []);

    const completeToolMessage = useCallback((
        id: string,
        result: { success: boolean; output: string; executionMs: number }
    ) => {
        setMessages(prev => prev.map(msg =>
            msg.id === id
                ? {
                    ...msg,
                    content: result.output,
                    isStreaming: false,
                    toolSuccess: result.success,
                    toolExecutionMs: result.executionMs,
                }
                : msg
        ));
    }, []);

    const addAnnotation = useCallback((
        annotationType: AnnotationType,
        content: string,
        annotationData: AnnotationData
    ): string => {
        const id = generateId();
        const message: Message = {
            id,
            role: 'annotation',
            content,
            timestamp: Date.now(),
            isStreaming: false,
            annotationType,
            annotationData,
        };
        setMessages(prev => [...prev, message]);
        return id;
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setCurrentStreamingId(null);
    }, []);

    return {
        messages,
        currentStreamingId,
        addUserMessage,
        startAssistantMessage,
        appendToStreaming,
        finishStreaming,
        addToolMessage,
        completeToolMessage,
        addAnnotation,
        clearMessages,
    };
}
