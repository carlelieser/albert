import { BaseOutput } from './base';
import type { Brain, BrainEvent } from '../brain';
import { Events } from '../events';

export interface ChunkData {
    text: string;
    done: boolean;
}

export interface OutputData {
    text: string;
}

export interface ToolStartData {
    correlationId: string;
    toolName: string;
    arguments: Record<string, unknown>;
}

export interface ToolCompleteData {
    correlationId: string;
    toolName: string;
    success: boolean;
    output: string;
    executionTimeMs: number;
}

export interface MemoryResultData {
    requestId: string;
    entries: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
    }>;
}

export interface KnowledgeResultData {
    requestId: string;
    facts: Array<{
        fact: string;
        similarity: number;
    }>;
}

export interface PersonalityResultData {
    requestId: string;
    systemPrompt: string;
    traits: {
        formality: number;
        verbosity: number;
        warmth: number;
        humor: number;
        confidence: number;
        useEmoji: boolean;
        preferBulletPoints: boolean;
        askFollowUpQuestions: boolean;
    };
}

export interface ThinkingData {
    thinking: string;
    model: string;
}

export type ChunkHandler = (data: ChunkData) => void;
export type ReadyHandler = (data: OutputData) => void;
export type StreamStartHandler = () => void;
export type ToolStartHandler = (data: ToolStartData) => void;
export type ToolCompleteHandler = (data: ToolCompleteData) => void;
export type MemoryResultHandler = (data: MemoryResultData) => void;
export type KnowledgeResultHandler = (data: KnowledgeResultData) => void;
export type PersonalityResultHandler = (data: PersonalityResultData) => void;
export type ThinkingHandler = (data: ThinkingData) => void;

export class InkOutput extends BaseOutput {
    private onChunk: ChunkHandler | null = null;
    private onReady: ReadyHandler | null = null;
    private onStreamStart: StreamStartHandler | null = null;
    private onToolStart: ToolStartHandler | null = null;
    private onToolComplete: ToolCompleteHandler | null = null;
    private onMemoryResult: MemoryResultHandler | null = null;
    private onKnowledgeResult: KnowledgeResultHandler | null = null;
    private onPersonalityResult: PersonalityResultHandler | null = null;
    private onThinking: ThinkingHandler | null = null;
    private isFirstChunk = true;

    constructor() {
        super('ink');
    }

    init(brain: Brain): void {
        super.init(brain);

        this.brain!.on(Events.OutputChunk, (event: BrainEvent) => {
            const data = event.data as ChunkData;

            // Emit stream start on first chunk
            if (this.isFirstChunk) {
                this.isFirstChunk = false;
                this.onStreamStart?.();
            }

            this.onChunk?.(data);

            // Reset for next message when done
            if (data.done) {
                this.isFirstChunk = true;
            }
        });

        // Tool execution events
        this.brain!.on(Events.ToolExecutionStart, (event: BrainEvent) => {
            this.onToolStart?.(event.data as ToolStartData);
        });

        this.brain!.on(Events.ToolExecutionComplete, (event: BrainEvent) => {
            this.onToolComplete?.(event.data as ToolCompleteData);
        });

        this.brain!.on(Events.ToolExecutionError, (event: BrainEvent) => {
            this.onToolComplete?.(event.data as ToolCompleteData);
        });

        this.brain!.on(Events.MemoryResult, (event: BrainEvent) => {
            this.onMemoryResult?.(event.data as MemoryResultData);
        });

        this.brain!.on(Events.KnowledgeResult, (event: BrainEvent) => {
            this.onKnowledgeResult?.(event.data as KnowledgeResultData);
        });

        this.brain!.on(Events.PersonalityResult, (event: BrainEvent) => {
            this.onPersonalityResult?.(event.data as PersonalityResultData);
        });

        this.brain!.on(Events.ThinkingReady, (event: BrainEvent) => {
            this.onThinking?.(event.data as ThinkingData);
        });
    }

    handleOutput(event: BrainEvent): void {
        const data = event.data as OutputData;
        this.onReady?.(data);
    }

    setChunkHandler(handler: ChunkHandler): void {
        this.onChunk = handler;
    }

    setReadyHandler(handler: ReadyHandler): void {
        this.onReady = handler;
    }

    setStreamStartHandler(handler: StreamStartHandler): void {
        this.onStreamStart = handler;
    }

    setToolStartHandler(handler: ToolStartHandler): void {
        this.onToolStart = handler;
    }

    setToolCompleteHandler(handler: ToolCompleteHandler): void {
        this.onToolComplete = handler;
    }

    setMemoryResultHandler(handler: MemoryResultHandler): void {
        this.onMemoryResult = handler;
    }

    setKnowledgeResultHandler(handler: KnowledgeResultHandler): void {
        this.onKnowledgeResult = handler;
    }

    setPersonalityResultHandler(handler: PersonalityResultHandler): void {
        this.onPersonalityResult = handler;
    }

    setThinkingHandler(handler: ThinkingHandler): void {
        this.onThinking = handler;
    }

    clearHandlers(): void {
        this.onChunk = null;
        this.onReady = null;
        this.onStreamStart = null;
        this.onToolStart = null;
        this.onToolComplete = null;
        this.onMemoryResult = null;
        this.onKnowledgeResult = null;
        this.onPersonalityResult = null;
        this.onThinking = null;
    }

    shutdown(): void {
        this.clearHandlers();
        this.isFirstChunk = true;
        super.shutdown();
    }
}
