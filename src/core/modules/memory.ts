import type { Ollama, Message } from 'ollama';
import { BaseModule } from './base';
import type { BrainEvent } from '../brain';
import { Events } from '../events';

export interface MemoryEntry {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

interface MemoryStorePayload {
    role: MemoryEntry['role'];
    content: string;
    metadata?: Record<string, unknown>;
}

interface MemoryQueryPayload {
    count: number;
    requestId: string;
}

export class MemoryModule extends BaseModule {
    private conversationHistory: MemoryEntry[] = [];
    private readonly maxEntries: number;
    private readonly workingMemory = new Map<string, unknown>();

    constructor(ollama: Ollama, maxEntries: number = 20) {
        super(ollama, 'memory');
        this.maxEntries = maxEntries;
    }

    registerListeners(): void {
        if (!this.brain) return;

        this.brain.on(Events.MemoryStore, (event: BrainEvent) => {
            const payload = event.data as MemoryStorePayload;
            this.addEntry(payload.role, payload.content, payload.metadata);
        });

        this.brain.on(Events.MemoryQuery, (event: BrainEvent) => {
            const payload = event.data as MemoryQueryPayload;
            const entries = this.getRecentContext(payload.count);

            this.brain!.emit(Events.MemoryResult, {
                requestId: payload.requestId,
                entries,
            });
        });
    }

    addEntry(
        role: MemoryEntry['role'],
        content: string,
        metadata?: Record<string, unknown>
    ): void {
        this.conversationHistory.push({
            role,
            content,
            timestamp: Date.now(),
            metadata,
        });

        // Enforce max entries - remove oldest
        while (this.conversationHistory.length > this.maxEntries) {
            this.conversationHistory.shift();
        }
    }

    getRecentContext(count: number = 10): MemoryEntry[] {
        return this.conversationHistory.slice(-count);
    }

    getConversationHistory(): MemoryEntry[] {
        return [...this.conversationHistory];
    }

    getAsMessages(): Message[] {
        return this.conversationHistory.map(entry => ({
            role: entry.role,
            content: entry.content,
        }));
    }

    setWorkingMemory(key: string, value: unknown): void {
        this.workingMemory.set(key, value);
    }

    getWorkingMemory(key: string): unknown {
        return this.workingMemory.get(key);
    }

    clearWorkingMemory(): void {
        this.workingMemory.clear();
    }

    async shutdown(): Promise<void> {
        this.conversationHistory = [];
        this.workingMemory.clear();
    }
}
