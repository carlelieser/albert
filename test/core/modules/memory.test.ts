import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect } from 'effect';
import { MemoryModule } from '../../../src/core/modules/memory';
import { Brain } from '../../../src/core/brain';
import { Events } from '../../../src/core/events';
import type { IMemoryRepository } from '../../../src/domain/repositories/memory.repository';
import type { MemoryEntry, Session } from '../../../src/domain/entities/memory';
import type { PrismaService } from '../../../src/infrastructure/database/prisma.effect';
import { SessionNotFoundError } from '../../../src/domain/errors';
import { createTestRuntime } from '../../helpers/test-runtime';

function createMockMemoryRepository(): IMemoryRepository<PrismaService> {
    const sessions = new Map<string, Session>();
    const entries = new Map<string, MemoryEntry[]>();
    let entryIdCounter = 1;

    const defaultSession: Session = {
        id: 'test-session-1',
        name: 'Test Session',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
    };
    sessions.set(defaultSession.id, defaultSession);
    entries.set(defaultSession.id, []);

    return {
        createSession: vi.fn().mockImplementation((name?: string) => {
            const session: Session = {
                id: `session-${Date.now()}`,
                name,
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
            };
            sessions.set(session.id, session);
            entries.set(session.id, []);
            return Effect.succeed(session);
        }),
        getSession: vi.fn().mockImplementation((id: string) => {
            const session = sessions.get(id);
            if (session) {
                return Effect.succeed(session);
            }
            return Effect.fail(new SessionNotFoundError({ sessionId: id }));
        }),
        getActiveSession: vi.fn().mockImplementation(() => {
            return Effect.succeed(defaultSession);
        }),
        closeSession: vi.fn().mockReturnValue(Effect.void),
        closeAllSessions: vi.fn().mockReturnValue(Effect.void),
        addEntry: vi.fn().mockImplementation((entry: Omit<MemoryEntry, 'id'>) => {
            const newEntry: MemoryEntry = { ...entry, id: entryIdCounter++ };
            const sessionEntries = entries.get(entry.sessionId) ?? [];
            sessionEntries.push(newEntry);
            entries.set(entry.sessionId, sessionEntries);
            return Effect.succeed(newEntry);
        }),
        getRecentEntries: vi.fn().mockImplementation((sessionId: string, limit = 10) => {
            const sessionEntries = entries.get(sessionId) ?? [];
            return Effect.succeed(sessionEntries.slice(-limit));
        }),
        getAllEntries: vi.fn().mockImplementation((sessionId: string) => {
            return Effect.succeed(entries.get(sessionId) ?? []);
        }),
        clearSession: vi.fn().mockImplementation((sessionId: string) => {
            entries.set(sessionId, []);
            return Effect.void;
        }),
    };
}

describe('MemoryModule', () => {
    let module: MemoryModule;
    let brain: Brain;
    let mockRepository: IMemoryRepository<PrismaService>;

    beforeEach(() => {
        brain = new Brain();
        brain.setRuntime(createTestRuntime());
        mockRepository = createMockMemoryRepository();
        module = new MemoryModule(mockRepository, 5);
    });

    describe('initialization', () => {
        it('should have name "memory"', () => {
            expect(module.getName()).toBe('memory');
        });

        it('should start with empty history', async () => {
            await module.init(brain);
            expect(await module.getConversationHistory()).toEqual([]);
        });
    });

    describe('event handling', () => {
        beforeEach(async () => {
            await module.init(brain);
        });

        it('should listen for MemoryStore events', async () => {
            brain.emit(Events.MemoryStore, {
                role: 'user',
                content: 'Hello',
            });

            // Wait for async event handler to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            const history = await module.getConversationHistory();
            expect(history.length).toBe(1);
            expect(history[0].role).toBe('user');
            expect(history[0].content).toBe('Hello');
        });

        it('should emit MemoryResult on MemoryQuery', async () => {
            const resultListener = vi.fn();
            brain.on(Events.MemoryResult, resultListener);

            // Store some entries and wait for async handlers
            brain.emit(Events.MemoryStore, { role: 'user', content: 'Hi' });
            brain.emit(Events.MemoryStore, { role: 'assistant', content: 'Hello!' });
            await new Promise((resolve) => setTimeout(resolve, 20));

            // Query and wait for async handler
            brain.emit(Events.MemoryQuery, {
                count: 10,
                requestId: 'req-123',
            });
            await new Promise((resolve) => setTimeout(resolve, 20));

            expect(resultListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        requestId: 'req-123',
                        entries: expect.arrayContaining([
                            expect.objectContaining({ role: 'user', content: 'Hi' }),
                            expect.objectContaining({ role: 'assistant', content: 'Hello!' }),
                        ]),
                    }),
                })
            );
        });
    });

    describe('addEntry', () => {
        beforeEach(async () => {
            await module.init(brain);
        });

        it('should add entry to history', async () => {
            await module.addEntry('user', 'Test message');
            const history = await module.getConversationHistory();

            expect(history.length).toBe(1);
            expect(history[0].role).toBe('user');
            expect(history[0].content).toBe('Test message');
        });

        it('should include timestamp', async () => {
            const before = Date.now();
            await module.addEntry('user', 'Test');
            const after = Date.now();

            const history = await module.getConversationHistory();
            expect(history[0].timestamp.getTime()).toBeGreaterThanOrEqual(before);
            expect(history[0].timestamp.getTime()).toBeLessThanOrEqual(after);
        });

        it('should accept metadata', async () => {
            await module.addEntry('user', 'Test', { source: 'cli' });
            const history = await module.getConversationHistory();

            expect(history[0].metadata).toEqual({ source: 'cli' });
        });
    });

    describe('getRecentContext', () => {
        beforeEach(async () => {
            await module.init(brain);
            await module.addEntry('user', 'Message 1');
            await module.addEntry('assistant', 'Response 1');
            await module.addEntry('user', 'Message 2');
            await module.addEntry('assistant', 'Response 2');
        });

        it('should return last N entries', async () => {
            const recent = await module.getRecentContext(2);
            expect(recent.length).toBe(2);
            expect(recent[0].content).toBe('Message 2');
            expect(recent[1].content).toBe('Response 2');
        });

        it('should return all entries if count exceeds history', async () => {
            const recent = await module.getRecentContext(10);
            expect(recent.length).toBe(4);
        });
    });

    describe('getAsMessages', () => {
        beforeEach(async () => {
            await module.init(brain);
            await module.addEntry('user', 'Hello');
            await module.addEntry('assistant', 'Hi there');
        });

        it('should return messages in Ollama format', async () => {
            const messages = await module.getAsMessages();

            expect(messages).toEqual([
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there' },
            ]);
        });
    });

    describe('buffer limit', () => {
        beforeEach(async () => {
            await module.init(brain);
        });

        it('should limit recent context entries', async () => {
            // Add more entries than the max (5)
            for (let i = 0; i < 8; i++) {
                await module.addEntry('user', `Message ${i}`);
            }

            // getRecentContext respects the buffer limit
            const recent = await module.getRecentContext(10);
            expect(recent.length).toBeLessThanOrEqual(5);
        });

        it('should return most recent entries in context', async () => {
            for (let i = 0; i < 8; i++) {
                await module.addEntry('user', `Message ${i}`);
            }

            const recent = await module.getRecentContext(5);
            // Should have the most recent messages
            expect(recent.some(e => e.content === 'Message 7')).toBe(true);
        });
    });

    describe('working memory', () => {
        beforeEach(async () => {
            await module.init(brain);
        });

        it('should set and get working memory values', () => {
            module.setWorkingMemory('currentTopic', 'weather');
            expect(module.getWorkingMemory('currentTopic')).toBe('weather');
        });

        it('should return undefined for non-existent keys', () => {
            expect(module.getWorkingMemory('nonexistent')).toBeUndefined();
        });

        it('should clear working memory', () => {
            module.setWorkingMemory('key1', 'value1');
            module.setWorkingMemory('key2', 'value2');
            module.clearWorkingMemory();

            expect(module.getWorkingMemory('key1')).toBeUndefined();
            expect(module.getWorkingMemory('key2')).toBeUndefined();
        });
    });

    describe('shutdown', () => {
        it('should clear working memory on shutdown', async () => {
            await module.init(brain);
            await module.addEntry('user', 'Test');
            module.setWorkingMemory('key', 'value');

            await module.shutdown();

            // Working memory should be cleared
            expect(module.getWorkingMemory('key')).toBeUndefined();
        });
    });
});
