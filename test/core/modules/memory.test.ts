import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryModule } from '../../../src/core/modules/memory';
import { Brain } from '../../../src/core/brain';
import { Events } from '../../../src/core/events';
import type { Ollama } from 'ollama';

describe('MemoryModule', () => {
    let module: MemoryModule;
    let brain: Brain;
    let mockOllama: Ollama;

    beforeEach(() => {
        mockOllama = {
            chat: vi.fn().mockResolvedValue({
                message: { content: 'Summary of conversation' },
            }),
        } as unknown as Ollama;
        brain = new Brain();
        module = new MemoryModule(mockOllama, 5); // Small buffer for testing
    });

    describe('initialization', () => {
        it('should have name "memory"', () => {
            expect(module.getName()).toBe('memory');
        });

        it('should start with empty history', () => {
            module.init(brain);
            expect(module.getConversationHistory()).toEqual([]);
        });
    });

    describe('event handling', () => {
        beforeEach(() => {
            module.init(brain);
        });

        it('should listen for MemoryStore events', () => {
            brain.emit(Events.MemoryStore, {
                role: 'user',
                content: 'Hello',
            });

            const history = module.getConversationHistory();
            expect(history.length).toBe(1);
            expect(history[0].role).toBe('user');
            expect(history[0].content).toBe('Hello');
        });

        it('should emit MemoryResult on MemoryQuery', () => {
            const resultListener = vi.fn();
            brain.on(Events.MemoryResult, resultListener);

            // Store some entries
            brain.emit(Events.MemoryStore, { role: 'user', content: 'Hi' });
            brain.emit(Events.MemoryStore, { role: 'assistant', content: 'Hello!' });

            // Query
            brain.emit(Events.MemoryQuery, {
                count: 10,
                requestId: 'req-123',
            });

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
        beforeEach(() => {
            module.init(brain);
        });

        it('should add entry to history', () => {
            module.addEntry('user', 'Test message');
            const history = module.getConversationHistory();

            expect(history.length).toBe(1);
            expect(history[0].role).toBe('user');
            expect(history[0].content).toBe('Test message');
        });

        it('should include timestamp', () => {
            const before = Date.now();
            module.addEntry('user', 'Test');
            const after = Date.now();

            const history = module.getConversationHistory();
            expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
            expect(history[0].timestamp).toBeLessThanOrEqual(after);
        });

        it('should accept metadata', () => {
            module.addEntry('user', 'Test', { source: 'cli' });
            const history = module.getConversationHistory();

            expect(history[0].metadata).toEqual({ source: 'cli' });
        });
    });

    describe('getRecentContext', () => {
        beforeEach(() => {
            module.init(brain);
            module.addEntry('user', 'Message 1');
            module.addEntry('assistant', 'Response 1');
            module.addEntry('user', 'Message 2');
            module.addEntry('assistant', 'Response 2');
        });

        it('should return last N entries', () => {
            const recent = module.getRecentContext(2);
            expect(recent.length).toBe(2);
            expect(recent[0].content).toBe('Message 2');
            expect(recent[1].content).toBe('Response 2');
        });

        it('should return all entries if count exceeds history', () => {
            const recent = module.getRecentContext(10);
            expect(recent.length).toBe(4);
        });
    });

    describe('getAsMessages', () => {
        beforeEach(() => {
            module.init(brain);
            module.addEntry('user', 'Hello');
            module.addEntry('assistant', 'Hi there');
        });

        it('should return messages in Ollama format', () => {
            const messages = module.getAsMessages();

            expect(messages).toEqual([
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there' },
            ]);
        });
    });

    describe('buffer limit', () => {
        beforeEach(() => {
            module.init(brain);
        });

        it('should not exceed max entries', () => {
            // Add more entries than the max (5)
            for (let i = 0; i < 8; i++) {
                module.addEntry('user', `Message ${i}`);
            }

            const history = module.getConversationHistory();
            expect(history.length).toBeLessThanOrEqual(5);
        });

        it('should keep most recent entries when at capacity', () => {
            for (let i = 0; i < 8; i++) {
                module.addEntry('user', `Message ${i}`);
            }

            const history = module.getConversationHistory();
            // Should have the most recent messages
            expect(history.some(e => e.content === 'Message 7')).toBe(true);
        });
    });

    describe('working memory', () => {
        beforeEach(() => {
            module.init(brain);
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
        it('should clear history on shutdown', async () => {
            module.init(brain);
            module.addEntry('user', 'Test');
            module.setWorkingMemory('key', 'value');

            await module.shutdown();

            expect(module.getConversationHistory()).toEqual([]);
        });
    });
});
