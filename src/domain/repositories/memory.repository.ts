import { type Effect } from 'effect';
import type { MemoryEntry, Session } from '../entities/memory';
import type {
    DatabaseError,
    SessionNotFoundError,
    NoActiveSessionError,
    SessionCreationError,
    MemoryEntryError,
} from '../errors';

/**
 * Effect-based Memory Repository interface.
 * All methods return Effects with typed errors.
 *
 * @typeParam R - The requirements/context type (e.g., PrismaService)
 */
export interface IMemoryRepository<R = never> {
    /**
     * Creates a new session, deactivating any existing active sessions.
     */
    createSession: (
        name?: string
    ) => Effect.Effect<Session, SessionCreationError | DatabaseError, R>;

    /**
     * Gets a session by ID.
     */
    getSession: (
        id: string
    ) => Effect.Effect<Session, SessionNotFoundError | DatabaseError, R>;

    /**
     * Gets the currently active session.
     */
    getActiveSession: () => Effect.Effect<Session, NoActiveSessionError | DatabaseError, R>;

    /**
     * Closes (deactivates) a session.
     */
    closeSession: (id: string) => Effect.Effect<void, SessionNotFoundError | DatabaseError, R>;

    /**
     * Closes all active sessions.
     */
    closeAllSessions: () => Effect.Effect<void, DatabaseError, R>;

    /**
     * Adds a memory entry to a session.
     */
    addEntry: (
        entry: Omit<MemoryEntry, 'id'>
    ) => Effect.Effect<MemoryEntry, MemoryEntryError | DatabaseError, R>;

    /**
     * Gets recent entries from a session.
     */
    getRecentEntries: (
        sessionId: string,
        limit?: number
    ) => Effect.Effect<MemoryEntry[], DatabaseError, R>;

    /**
     * Gets all entries from a session.
     */
    getAllEntries: (sessionId: string) => Effect.Effect<MemoryEntry[], DatabaseError, R>;

    /**
     * Clears all entries from a session.
     */
    clearSession: (sessionId: string) => Effect.Effect<void, DatabaseError, R>;
}
