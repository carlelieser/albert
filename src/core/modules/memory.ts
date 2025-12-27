import { Effect } from 'effect';
import type { Message } from 'ollama';
import { BaseModule } from './base';
import type { Brain, BrainEvent } from '../brain';
import { Events } from '../events';
import type { IMemoryRepository } from '../../domain/repositories/memory.repository';
import type { MemoryEntry, Session } from '../../domain/entities/memory';
import type { PrismaService } from '../../infrastructure/database/prisma.effect';
import type { AppServices } from '../../infrastructure/layers';

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
    private currentSessionId: string | null = null;
    private readonly maxEntries: number;
    private readonly workingMemory = new Map<string, unknown>();

    constructor(
        private readonly repository: IMemoryRepository<PrismaService>,
        maxEntries: number = 20
    ) {
        super('memory');
        this.maxEntries = maxEntries;
    }

    async init(brain: Brain): Promise<void> {
        super.init(brain);
        await this.runEffect(this.initSessionEffect());
    }

    private initSessionEffect(): Effect.Effect<void, never, AppServices> {
        return Effect.gen(this, function* () {
            const session = yield* this.repository.getActiveSession().pipe(
                Effect.catchTag('NoActiveSessionError', () =>
                    this.repository.createSession()
                )
            );
            this.currentSessionId = session.id;
        }).pipe(
            Effect.catchAll(() => Effect.void)
        );
    }

    registerListeners(): void {
        if (!this.brain) return;

        this.brain.on(Events.MemoryStore, (event: BrainEvent) => {
            const payload = event.data as MemoryStorePayload;
            this.forkEffect(this.handleStoreEffect(payload));
        });

        this.brain.on(Events.MemoryQuery, (event: BrainEvent) => {
            const payload = event.data as MemoryQueryPayload;
            this.forkEffect(this.handleQueryEffect(payload));
        });
    }

    private handleStoreEffect(
        payload: MemoryStorePayload
    ): Effect.Effect<void, never, AppServices> {
        return Effect.gen(this, function* () {
            if (!this.currentSessionId) {
                yield* this.initSessionEffect();
            }

            yield* this.repository.addEntry({
                sessionId: this.currentSessionId!,
                role: payload.role,
                content: payload.content,
                timestamp: new Date(),
                metadata: payload.metadata,
            });
        }).pipe(
            Effect.catchAll(() => Effect.void)
        );
    }

    private handleQueryEffect(
        payload: MemoryQueryPayload
    ): Effect.Effect<void, never, AppServices> {
        if (!this.currentSessionId) {
            return Effect.sync(() =>
                this.brain!.emit(Events.MemoryResult, {
                    requestId: payload.requestId,
                    entries: [],
                })
            );
        }

        return this.repository.getRecentEntries(
            this.currentSessionId,
            Math.min(payload.count, this.maxEntries)
        ).pipe(
            Effect.tap((entries) =>
                Effect.sync(() =>
                    this.brain!.emit(Events.MemoryResult, {
                        requestId: payload.requestId,
                        entries,
                    })
                )
            ),
            Effect.catchAll(() =>
                Effect.sync(() =>
                    this.brain!.emit(Events.MemoryResult, {
                        requestId: payload.requestId,
                        entries: [],
                    })
                )
            ),
            Effect.asVoid
        );
    }

    addEntryEffect(
        role: MemoryEntry['role'],
        content: string,
        metadata?: Record<string, unknown>
    ): Effect.Effect<void, never, AppServices> {
        return Effect.gen(this, function* () {
            if (!this.currentSessionId) {
                yield* this.initSessionEffect();
            }

            yield* this.repository.addEntry({
                sessionId: this.currentSessionId!,
                role,
                content,
                timestamp: new Date(),
                metadata,
            });
        }).pipe(
            Effect.catchAll(() => Effect.void)
        );
    }

    async addEntry(
        role: MemoryEntry['role'],
        content: string,
        metadata?: Record<string, unknown>
    ): Promise<void> {
        await this.runEffect(this.addEntryEffect(role, content, metadata));
    }

    getRecentContextEffect(
        count: number = 10
    ): Effect.Effect<MemoryEntry[], never, AppServices> {
        if (!this.currentSessionId) {
            return Effect.succeed([]);
        }

        return this.repository.getRecentEntries(
            this.currentSessionId,
            Math.min(count, this.maxEntries)
        ).pipe(
            Effect.catchAll(() => Effect.succeed([]))
        );
    }

    async getRecentContext(count: number = 10): Promise<MemoryEntry[]> {
        return await this.runEffect(this.getRecentContextEffect(count));
    }

    getConversationHistoryEffect(): Effect.Effect<MemoryEntry[], never, AppServices> {
        if (!this.currentSessionId) {
            return Effect.succeed([]);
        }

        return this.repository.getAllEntries(this.currentSessionId).pipe(
            Effect.catchAll(() => Effect.succeed([]))
        );
    }

    async getConversationHistory(): Promise<MemoryEntry[]> {
        return await this.runEffect(this.getConversationHistoryEffect());
    }

    async getAsMessages(): Promise<Message[]> {
        const history = await this.getConversationHistory();
        return history.map((entry) => ({
            role: entry.role,
            content: entry.content,
        }));
    }

    getCurrentSessionEffect(): Effect.Effect<Session | null, never, AppServices> {
        if (!this.currentSessionId) {
            return Effect.succeed(null);
        }

        return this.repository.getSession(this.currentSessionId).pipe(
            Effect.catchTag('SessionNotFoundError', () => Effect.succeed(null)),
            Effect.catchAll(() => Effect.succeed(null))
        );
    }

    async getCurrentSession(): Promise<Session | null> {
        return await this.runEffect(this.getCurrentSessionEffect());
    }

    startNewSessionEffect(
        name?: string
    ): Effect.Effect<Session, never, AppServices> {
        return this.repository.createSession(name).pipe(
            Effect.tap((session) =>
                Effect.sync(() => {
                    this.currentSessionId = session.id;
                })
            ),
            Effect.catchAll(() =>
                Effect.succeed({ id: '', name: name ?? '', createdAt: new Date(), updatedAt: new Date(), isActive: false })
            )
        );
    }

    async startNewSession(name?: string): Promise<Session> {
        return await this.runEffect(this.startNewSessionEffect(name));
    }

    clearCurrentSessionEffect(): Effect.Effect<void, never, AppServices> {
        if (!this.currentSessionId) {
            return Effect.void;
        }

        return this.repository.clearSession(this.currentSessionId).pipe(
            Effect.catchAll(() => Effect.void)
        );
    }

    async clearCurrentSession(): Promise<void> {
        await this.runEffect(this.clearCurrentSessionEffect());
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
        this.workingMemory.clear();
    }
}

export type { MemoryEntry, Session };
