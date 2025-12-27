export interface MemoryEntry {
    id?: number;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

export interface Session {
    id: string;
    name?: string | null;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    entries?: MemoryEntry[];
}
