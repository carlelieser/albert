import { Effect } from 'effect';
import type { IMemoryRepository } from '../../src/domain/repositories/memory.repository';
import type { IKnowledgeRepository } from '../../src/domain/repositories/knowledge.repository';
import type { IPersonalityRepository } from '../../src/domain/repositories/personality.repository';
import type { MemoryEntry, Session } from '../../src/domain/entities/memory';
import type { KnowledgeFact, SemanticSearchResult } from '../../src/domain/entities/knowledge';
import type { PersonalityProfile, PersonalityTraits } from '../../src/domain/entities/personality';
import type { PrismaService } from '../../src/infrastructure/database/prisma.effect';

export interface MockMemoryState {
    entries: Map<string, MemoryEntry[]>;
    sessions: Map<string, Session>;
    activeSessionId: string;
}

export function createMockMemoryState(): MockMemoryState {
    const defaultSession: Session = {
        id: 'default-session',
        name: 'Default Session',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    return {
        entries: new Map([['default-session', []]]),
        sessions: new Map([['default-session', defaultSession]]),
        activeSessionId: 'default-session',
    };
}

export function createMockMemoryRepository(state: MockMemoryState): IMemoryRepository<PrismaService> {
    return {
        createSession: (name?: string) =>
            Effect.succeed({
                id: crypto.randomUUID(),
                name: name ?? 'New Session',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as Session),

        getSession: (id: string) =>
            Effect.gen(function* () {
                const session = state.sessions.get(id);
                if (!session) {
                    return yield* Effect.fail({ _tag: 'SessionNotFoundError', sessionId: id } as const);
                }
                return session;
            }),

        getActiveSession: () =>
            Effect.gen(function* () {
                const session = state.sessions.get(state.activeSessionId);
                if (!session) {
                    return yield* Effect.fail({ _tag: 'NoActiveSessionError' } as const);
                }
                return session;
            }),

        closeSession: (_id: string) => Effect.void,

        closeAllSessions: () => Effect.void,

        addEntry: (entry: Omit<MemoryEntry, 'id'>) =>
            Effect.succeed({
                id: crypto.randomUUID(),
                ...entry,
            } as MemoryEntry).pipe(
                Effect.tap((newEntry) =>
                    Effect.sync(() => {
                        const entries = state.entries.get(entry.sessionId) ?? [];
                        entries.push(newEntry);
                        state.entries.set(entry.sessionId, entries);
                    })
                )
            ),

        getRecentEntries: (sessionId: string, limit = 20) =>
            Effect.succeed(
                (state.entries.get(sessionId) ?? []).slice(-limit)
            ),

        getAllEntries: (sessionId: string) =>
            Effect.succeed(state.entries.get(sessionId) ?? []),

        clearSession: (_sessionId: string) => Effect.void,
    };
}

export interface MockKnowledgeState {
    facts: Map<number, KnowledgeFact>;
    nextId: number;
}

export function createMockKnowledgeState(): MockKnowledgeState {
    return {
        facts: new Map(),
        nextId: 1,
    };
}

export function createMockKnowledgeRepository(state: MockKnowledgeState): IKnowledgeRepository<PrismaService> {
    return {
        storeFact: (fact: string, source?: string, confidence?: number) => {
            const id = state.nextId++;
            const newFact: KnowledgeFact = {
                id,
                fact,
                source: source ?? 'unknown',
                confidence: confidence ?? 1.0,
                embedding: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            state.facts.set(id, newFact);
            return Effect.succeed(id);
        },

        storeFactWithEmbedding: (fact: string, embedding: number[], source?: string, confidence?: number) => {
            const id = state.nextId++;
            const newFact: KnowledgeFact = {
                id,
                fact,
                source: source ?? 'unknown',
                confidence: confidence ?? 1.0,
                embedding,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            state.facts.set(id, newFact);
            return Effect.succeed(id);
        },

        getFact: (id: number) =>
            Effect.gen(function* () {
                const fact = state.facts.get(id);
                if (!fact) {
                    return yield* Effect.fail({ _tag: 'FactNotFoundError', factId: id } as const);
                }
                return fact;
            }),

        getAllFacts: (_includeEmbeddings?: boolean) =>
            Effect.succeed(Array.from(state.facts.values())),

        searchByEmbedding: (_embedding: number[], _limit?: number) =>
            Effect.succeed([] as SemanticSearchResult[]),

        deleteFact: (id: number) =>
            Effect.sync(() => {
                state.facts.delete(id);
            }),

        updateEmbedding: (id: number, embedding: number[]) =>
            Effect.gen(function* () {
                const fact = state.facts.get(id);
                if (!fact) {
                    return yield* Effect.fail({ _tag: 'FactNotFoundError', factId: id } as const);
                }
                fact.embedding = embedding;
                fact.updatedAt = new Date();
            }),
    };
}

export interface MockPersonalityState {
    profile: PersonalityProfile;
}

export function createMockPersonalityState(): MockPersonalityState {
    return {
        profile: {
            id: 'default-profile',
            name: 'default',
            formality: 0.5,
            verbosity: 0.5,
            warmth: 0.7,
            humor: 0.3,
            confidence: 0.6,
            useEmoji: false,
            useBulletPoints: true,
            askFollowUp: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    };
}

export function createMockPersonalityRepository(state: MockPersonalityState): IPersonalityRepository<PrismaService> {
    return {
        getProfile: (_name?: string) => Effect.succeed(state.profile),

        saveProfile: (profile: Partial<PersonalityProfile> & { name: string }) =>
            Effect.succeed({
                ...state.profile,
                ...profile,
                updatedAt: new Date(),
            } as PersonalityProfile).pipe(
                Effect.tap((updated) =>
                    Effect.sync(() => {
                        state.profile = updated;
                    })
                )
            ),

        updateTraits: (_name: string, traits: Partial<PersonalityTraits>) =>
            Effect.succeed({
                ...state.profile,
                ...traits,
                updatedAt: new Date(),
            } as PersonalityProfile).pipe(
                Effect.tap((updated) =>
                    Effect.sync(() => {
                        state.profile = updated;
                    })
                )
            ),

        getOrCreateDefault: () => Effect.succeed(state.profile),
    };
}
