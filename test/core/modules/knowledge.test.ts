import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KnowledgeModule } from '../../../src/core/modules/knowledge';
import { Brain } from '../../../src/core/brain';
import { Events } from '../../../src/core/events';
import type { Ollama } from 'ollama';
import * as fs from 'fs';

describe('KnowledgeModule', () => {
    let module: KnowledgeModule;
    let brain: Brain;
    let mockOllama: Ollama;
    const testDbPath = './test-knowledge.db';

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        mockOllama = {} as Ollama;
        brain = new Brain();
        module = new KnowledgeModule(mockOllama, testDbPath);
    });

    afterEach(async () => {
        await module.shutdown();
        // Clean up test database
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('initialization', () => {
        it('should have name "knowledge"', () => {
            expect(module.getName()).toBe('knowledge');
        });

        it('should create database on init', () => {
            module.init(brain);
            expect(fs.existsSync(testDbPath)).toBe(true);
        });
    });

    describe('event handling', () => {
        it('should listen for KnowledgeStore events', () => {
            module.init(brain);

            // Module should be listening
            brain.emit(Events.KnowledgeStore, {
                fact: 'The sky is blue',
                source: 'user',
            });

            // Verify the fact was stored
            const facts = module.getAllFacts();
            expect(facts.length).toBe(1);
            expect(facts[0].fact).toBe('The sky is blue');
        });

        it('should emit KnowledgeResult on KnowledgeQuery', () => {
            const resultListener = vi.fn();
            brain.on(Events.KnowledgeResult, resultListener);

            module.init(brain);

            // Store a fact first
            brain.emit(Events.KnowledgeStore, {
                fact: 'Water is wet',
                source: 'user',
            });

            // Query for it
            brain.emit(Events.KnowledgeQuery, {
                query: 'water',
                requestId: 'req-123',
            });

            expect(resultListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        requestId: 'req-123',
                        facts: expect.arrayContaining([
                            expect.objectContaining({ fact: 'Water is wet' }),
                        ]),
                    }),
                })
            );
        });
    });

    describe('fact storage', () => {
        beforeEach(() => {
            module.init(brain);
        });

        it('should store a fact', () => {
            module.storeFact('Dogs are mammals', 'test');
            const facts = module.getAllFacts();
            expect(facts.length).toBe(1);
            expect(facts[0].fact).toBe('Dogs are mammals');
        });

        it('should store fact with confidence', () => {
            module.storeFact('Cats have four legs', 'test', 0.9);
            const facts = module.getAllFacts();
            expect(facts[0].confidence).toBe(0.9);
        });

        it('should store fact with source', () => {
            module.storeFact('Birds can fly', 'encyclopedia');
            const facts = module.getAllFacts();
            expect(facts[0].source).toBe('encyclopedia');
        });

        it('should update existing fact on duplicate', () => {
            module.storeFact('Grass is green', 'user', 0.8);
            module.storeFact('Grass is green', 'user', 0.95);

            const facts = module.getAllFacts();
            expect(facts.length).toBe(1);
            expect(facts[0].confidence).toBe(0.95);
        });
    });

    describe('fact search', () => {
        beforeEach(() => {
            module.init(brain);
            module.storeFact('The capital of France is Paris', 'geography');
            module.storeFact('The capital of Germany is Berlin', 'geography');
            module.storeFact('Dogs are loyal pets', 'animals');
        });

        it('should search facts by keyword', () => {
            const results = module.search('capital');
            expect(results.length).toBe(2);
        });

        it('should search facts by specific term', () => {
            const results = module.search('Paris');
            expect(results.length).toBe(1);
            expect(results[0].fact).toContain('Paris');
        });

        it('should return empty array for no matches', () => {
            const results = module.search('quantum physics');
            expect(results.length).toBe(0);
        });

        it('should respect limit parameter', () => {
            module.storeFact('Capital cities are important', 'test');
            const results = module.search('capital', 1);
            expect(results.length).toBe(1);
        });
    });

    describe('getAllFacts', () => {
        beforeEach(() => {
            module.init(brain);
        });

        it('should return all stored facts', () => {
            module.storeFact('Fact one', 'test');
            module.storeFact('Fact two', 'test');
            module.storeFact('Fact three', 'test');

            const facts = module.getAllFacts();
            expect(facts.length).toBe(3);
        });

        it('should return facts ordered by updated_at desc', async () => {
            module.storeFact('Old fact', 'test');
            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
            module.storeFact('New fact', 'test');

            const facts = module.getAllFacts();
            expect(facts[0].fact).toBe('New fact');
        });
    });

    describe('shutdown', () => {
        it('should close database connection', async () => {
            module.init(brain);
            module.storeFact('Test', 'test');
            await module.shutdown();

            // After shutdown, operations should not work
            expect(() => module.getAllFacts()).toThrow();
        });
    });
});
