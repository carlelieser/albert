import type { MemoryEntry, Session } from '../entities/memory';

export interface IMemoryRepository {
    createSession: (name?: string) => Promise<Session>;
    getSession: (id: string) => Promise<Session | null>;
    getActiveSession: () => Promise<Session | null>;
    closeSession: (id: string) => Promise<void>;
    closeAllSessions: () => Promise<void>;

    addEntry: (entry: Omit<MemoryEntry, 'id'>) => Promise<MemoryEntry>;
    getRecentEntries: (sessionId: string, limit?: number) => Promise<MemoryEntry[]>;
    getAllEntries: (sessionId: string) => Promise<MemoryEntry[]>;
    clearSession: (sessionId: string) => Promise<void>;
}
