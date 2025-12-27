import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutiveModule } from '../../../src/core/modules/executive';
import { Brain } from '../../../src/core/brain';
import { Events } from '../../../src/core/events';
import type { Ollama } from 'ollama';

describe('ExecutiveModule', () => {
    let module: ExecutiveModule;
    let brain: Brain;
    let mockOllama: Ollama;

    beforeEach(() => {
        mockOllama = {
            chat: vi.fn().mockResolvedValue({
                message: { content: 'Hello! How can I help you today?' },
            }),
        } as unknown as Ollama;
        brain = new Brain();
        module = new ExecutiveModule(mockOllama);
    });

    describe('initialization', () => {
        it('should have name "executive"', () => {
            expect(module.getName()).toBe('executive');
        });
    });

    describe('event listening', () => {
        beforeEach(() => {
            module.init(brain);
        });

        it('should listen for InputReceived events', () => {
            const memoryQueryListener = vi.fn();
            brain.on(Events.MemoryQuery, memoryQueryListener);

            brain.emit(Events.InputReceived, { text: 'Hello' });

            // Should query memory as part of processing
            expect(memoryQueryListener).toHaveBeenCalled();
        });

        it('should query personality for system prompt', () => {
            const personalityQueryListener = vi.fn();
            brain.on(Events.PersonalityQuery, personalityQueryListener);

            brain.emit(Events.InputReceived, { text: 'Hello' });

            expect(personalityQueryListener).toHaveBeenCalled();
        });

        it('should query knowledge for relevant facts', () => {
            const knowledgeQueryListener = vi.fn();
            brain.on(Events.KnowledgeQuery, knowledgeQueryListener);

            brain.emit(Events.InputReceived, { text: 'Hello' });

            expect(knowledgeQueryListener).toHaveBeenCalled();
        });
    });

    describe('response flow', () => {
        beforeEach(() => {
            module.init(brain);
        });

        it('should emit OutputReady after processing', async () => {
            const outputListener = vi.fn();
            brain.on(Events.OutputReady, outputListener);

            // Simulate module responses
            brain.on(Events.MemoryQuery, (event) => {
                brain.emit(Events.MemoryResult, {
                    requestId: (event.data ).requestId,
                    entries: [],
                });
            });

            brain.on(Events.PersonalityQuery, (event) => {
                brain.emit(Events.PersonalityResult, {
                    requestId: (event.data ).requestId,
                    systemPrompt: 'You are Albert.',
                });
            });

            brain.on(Events.KnowledgeQuery, (event) => {
                brain.emit(Events.KnowledgeResult, {
                    requestId: (event.data ).requestId,
                    facts: [],
                });
            });

            // Trigger input
            brain.emit(Events.InputReceived, { text: 'Hello' });

            // Wait for async processing
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(outputListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        text: expect.any(String),
                    }),
                })
            );
        });

        it('should store user message in memory', async () => {
            const memoryStoreListener = vi.fn();
            brain.on(Events.MemoryStore, memoryStoreListener);

            // Simulate module responses
            brain.on(Events.MemoryQuery, (event) => {
                brain.emit(Events.MemoryResult, {
                    requestId: (event.data ).requestId,
                    entries: [],
                });
            });

            brain.on(Events.PersonalityQuery, (event) => {
                brain.emit(Events.PersonalityResult, {
                    requestId: (event.data ).requestId,
                    systemPrompt: 'You are Albert.',
                });
            });

            brain.on(Events.KnowledgeQuery, (event) => {
                brain.emit(Events.KnowledgeResult, {
                    requestId: (event.data ).requestId,
                    facts: [],
                });
            });

            brain.emit(Events.InputReceived, { text: 'My name is John' });

            await new Promise(resolve => setTimeout(resolve, 50));

            // Should store both user message and assistant response
            expect(memoryStoreListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        role: 'user',
                        content: 'My name is John',
                    }),
                })
            );
        });

        it('should store assistant response in memory', async () => {
            const memoryStoreCalls: any[] = [];
            brain.on(Events.MemoryStore, (event) => {
                memoryStoreCalls.push(event.data);
            });

            // Simulate module responses
            brain.on(Events.MemoryQuery, (event) => {
                brain.emit(Events.MemoryResult, {
                    requestId: (event.data ).requestId,
                    entries: [],
                });
            });

            brain.on(Events.PersonalityQuery, (event) => {
                brain.emit(Events.PersonalityResult, {
                    requestId: (event.data ).requestId,
                    systemPrompt: 'You are Albert.',
                });
            });

            brain.on(Events.KnowledgeQuery, (event) => {
                brain.emit(Events.KnowledgeResult, {
                    requestId: (event.data ).requestId,
                    facts: [],
                });
            });

            brain.emit(Events.InputReceived, { text: 'Hello' });

            await new Promise(resolve => setTimeout(resolve, 50));

            // Should have stored assistant response
            const assistantStore = memoryStoreCalls.find(c => c.role === 'assistant');
            expect(assistantStore).toBeDefined();
            expect(assistantStore.content).toBe('Hello! How can I help you today?');
        });
    });

    describe('Ollama integration', () => {
        beforeEach(() => {
            module.init(brain);
        });

        it('should call Ollama with conversation context', async () => {
            // Simulate module responses
            brain.on(Events.MemoryQuery, (event) => {
                brain.emit(Events.MemoryResult, {
                    requestId: (event.data ).requestId,
                    entries: [
                        { role: 'user', content: 'Hi' },
                        { role: 'assistant', content: 'Hello!' },
                    ],
                });
            });

            brain.on(Events.PersonalityQuery, (event) => {
                brain.emit(Events.PersonalityResult, {
                    requestId: (event.data ).requestId,
                    systemPrompt: 'You are Albert.',
                });
            });

            brain.on(Events.KnowledgeQuery, (event) => {
                brain.emit(Events.KnowledgeResult, {
                    requestId: (event.data ).requestId,
                    facts: [],
                });
            });

            brain.emit(Events.InputReceived, { text: 'How are you?' });

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(mockOllama.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'llama3.1:8b',
                    messages: expect.arrayContaining([
                        expect.objectContaining({ role: 'system' }),
                        expect.objectContaining({ role: 'user', content: 'How are you?' }),
                    ]),
                })
            );
        });
    });

    describe('request correlation', () => {
        beforeEach(() => {
            module.init(brain);
        });

        it('should use unique request IDs', () => {
            const requestIds: string[] = [];

            brain.on(Events.MemoryQuery, (event) => {
                requestIds.push((event.data ).requestId);
                brain.emit(Events.MemoryResult, {
                    requestId: (event.data ).requestId,
                    entries: [],
                });
            });

            brain.on(Events.PersonalityQuery, (event) => {
                requestIds.push((event.data ).requestId);
                brain.emit(Events.PersonalityResult, {
                    requestId: (event.data ).requestId,
                    systemPrompt: 'You are Albert.',
                });
            });

            brain.on(Events.KnowledgeQuery, (event) => {
                requestIds.push((event.data ).requestId);
                brain.emit(Events.KnowledgeResult, {
                    requestId: (event.data ).requestId,
                    facts: [],
                });
            });

            brain.emit(Events.InputReceived, { text: 'Test 1' });
            brain.emit(Events.InputReceived, { text: 'Test 2' });

            // All request IDs should be unique
            const uniqueIds = new Set(requestIds);
            expect(uniqueIds.size).toBe(requestIds.length);
        });
    });

    describe('shutdown', () => {
        it('should not throw on shutdown', async () => {
            module.init(brain);
            await expect(module.shutdown()).resolves.not.toThrow();
        });
    });
});
