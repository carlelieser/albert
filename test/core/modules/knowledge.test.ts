import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Effect } from 'effect';
import { KnowledgeModule } from '../../../src/core/modules/knowledge';
import { Brain } from '../../../src/core/brain';
import { Events } from '../../../src/core/events';
import type { Ollama, EmbedResponse } from 'ollama';
import type { IKnowledgeRepository } from '../../../src/domain/repositories/knowledge.repository';
import type { KnowledgeFact, SemanticSearchResult } from '../../../src/domain/entities/knowledge';
import type { PrismaService } from '../../../src/infrastructure/database/prisma.effect';
import { FactNotFoundError } from '../../../src/domain/errors';
import { createTestRuntime } from '../../helpers/test-runtime';

function createMockOllama(): Ollama {
    const mockEmbed = vi.fn().mockImplementation(async ({ input }: { model: string; input: string | string[] }) => {
        const inputs = Array.isArray(input) ? input : [input];
        const embeddings = inputs.map(text => {
            // Generate deterministic mock embeddings based on content
            const base: number[] = Array(384).fill(0) as number[];
            const lower = text.toLowerCase();

            // Pet-related embeddings
            if (lower.includes('pet') || lower.includes('dog') || lower.includes('cat') || lower.includes('animal') || lower.includes('retriever')) {
                base[0] = 0.9;
                base[1] = 0.7;
                base[2] = 0.5;
            }

            // Geography/capital-related embeddings
            if (lower.includes('capital') || lower.includes('city') || lower.includes('country') || lower.includes('located') || lower.includes('where')) {
                base[10] = 0.6;
                base[11] = 0.4;
            }

            // France/Paris embeddings (strong signal)
            if (lower.includes('france') || lower.includes('paris')) {
                base[20] = 0.95;
                base[21] = 0.8;
                base[10] = Math.max(base[10], 0.5);
            }

            // Germany/Berlin embeddings
            if (lower.includes('germany') || lower.includes('berlin')) {
                base[22] = 0.95;
                base[23] = 0.8;
                base[10] = Math.max(base[10], 0.5);
            }

            // Add small unique component based on text hash to differentiate
            const hash = lower.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
            base[100 + (hash % 100)] = 0.1;

            // Normalize the vector
            const magnitude = Math.sqrt(base.reduce((sum: number, v: number) => sum + v * v, 0));
            return magnitude === 0 ? base : base.map((v: number) => v / magnitude);
        });

        const response: EmbedResponse = {
            model: 'nomic-embed-text',
            embeddings,
            total_duration: 100,
            load_duration: 50,
            prompt_eval_count: 10,
        };
        return response;
    });

    return {
        embed: mockEmbed,
    } as unknown as Ollama;
}

function createMockKnowledgeRepository(): IKnowledgeRepository<PrismaService> {
    const facts = new Map<number, KnowledgeFact>();
    let idCounter = 1;

    return {
        storeFact: vi.fn().mockImplementation((fact: string, source?: string, confidence = 1.0) => {
            // Check for existing fact
            for (const [id, existingFact] of facts) {
                if (existingFact.fact === fact) {
                    existingFact.confidence = confidence;
                    existingFact.source = source ?? null;
                    existingFact.updatedAt = new Date();
                    return Effect.succeed(id);
                }
            }
            const id = idCounter++;
            facts.set(id, {
                id,
                fact,
                source: source ?? null,
                confidence,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            return Effect.succeed(id);
        }),
        storeFactWithEmbedding: vi.fn().mockImplementation((fact: string, embedding: number[], source?: string, confidence = 1.0) => {
            // Check for existing fact
            for (const [id, existingFact] of facts) {
                if (existingFact.fact === fact) {
                    existingFact.confidence = confidence;
                    existingFact.source = source ?? null;
                    existingFact.embedding = embedding;
                    existingFact.updatedAt = new Date();
                    return Effect.succeed(id);
                }
            }
            const id = idCounter++;
            facts.set(id, {
                id,
                fact,
                source: source ?? null,
                confidence,
                embedding,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            return Effect.succeed(id);
        }),
        getFact: vi.fn().mockImplementation((id: number) => {
            const fact = facts.get(id);
            if (fact) {
                return Effect.succeed(fact);
            }
            return Effect.fail(new FactNotFoundError({ factId: id }));
        }),
        getAllFacts: vi.fn().mockImplementation(() => {
            return Effect.succeed(
                Array.from(facts.values()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            );
        }),
        searchByEmbedding: vi.fn().mockImplementation((_embedding: number[], limit = 10) => {
            const results: SemanticSearchResult[] = Array.from(facts.values())
                .filter(f => f.embedding)
                .map(f => ({ ...f, similarity: 0.8 }))
                .slice(0, limit);
            return Effect.succeed(results);
        }),
        deleteFact: vi.fn().mockImplementation((id: number) => {
            if (facts.delete(id)) {
                return Effect.void;
            }
            return Effect.fail(new FactNotFoundError({ factId: id }));
        }),
        updateEmbedding: vi.fn().mockImplementation((id: number, embedding: number[]) => {
            const fact = facts.get(id);
            if (fact) {
                fact.embedding = embedding;
                return Effect.void;
            }
            return Effect.fail(new FactNotFoundError({ factId: id }));
        }),
    };
}

describe('KnowledgeModule', () => {
    let module: KnowledgeModule;
    let brain: Brain;
    let mockOllama: Ollama;
    let mockRepository: IKnowledgeRepository<PrismaService>;

    beforeEach(() => {
        mockOllama = createMockOllama();
        brain = new Brain();
        brain.setRuntime(createTestRuntime(mockOllama));
        mockRepository = createMockKnowledgeRepository();
        module = new KnowledgeModule(mockRepository);
    });

    afterEach(async () => {
        await module.shutdown();
    });

    describe('initialization', () => {
        it('should have name "knowledge"', () => {
            expect(module.getName()).toBe('knowledge');
        });

        it('should initialize successfully', () => {
            module.init(brain);
            expect(module.getName()).toBe('knowledge');
        });
    });

    describe('event handling', () => {
        it('should listen for KnowledgeStore events', async () => {
            module.init(brain);

            // Module should be listening
            brain.emit(Events.KnowledgeStore, {
                fact: 'The sky is blue',
                source: 'user',
            });

            // Wait for async event handler
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Verify the fact was stored
            const facts = await module.getAllFacts();
            expect(facts.length).toBe(1);
            expect(facts[0].fact).toBe('The sky is blue');
        });

        it('should emit KnowledgeResult on KnowledgeQuery', async () => {
            const resultListener = vi.fn();
            brain.on(Events.KnowledgeResult, resultListener);

            module.init(brain);

            // Store a fact first and wait for async handler
            brain.emit(Events.KnowledgeStore, {
                fact: 'Water is wet',
                source: 'user',
            });
            await new Promise((resolve) => setTimeout(resolve, 20));

            // Query for it and wait for async handler
            brain.emit(Events.KnowledgeQuery, {
                query: 'water',
                requestId: 'req-123',
            });
            await new Promise((resolve) => setTimeout(resolve, 20));

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

        it('should store a fact', async () => {
            await module.storeFact('Dogs are mammals', 'test');
            const facts = await module.getAllFacts();
            expect(facts.length).toBe(1);
            expect(facts[0].fact).toBe('Dogs are mammals');
        });

        it('should store fact with confidence', async () => {
            await module.storeFact('Cats have four legs', 'test', 0.9);
            const facts = await module.getAllFacts();
            expect(facts[0].confidence).toBe(0.9);
        });

        it('should store fact with source', async () => {
            await module.storeFact('Birds can fly', 'encyclopedia');
            const facts = await module.getAllFacts();
            expect(facts[0].source).toBe('encyclopedia');
        });

        it('should update existing fact on duplicate', async () => {
            await module.storeFact('Grass is green', 'user', 0.8);
            await module.storeFact('Grass is green', 'user', 0.95);

            const facts = await module.getAllFacts();
            expect(facts.length).toBe(1);
            expect(facts[0].confidence).toBe(0.95);
        });
    });

    describe('semantic search', () => {
        beforeEach(async () => {
            module.init(brain);
            await module.storeFact('The capital of France is Paris', 'geography');
            await module.storeFact('The capital of Germany is Berlin', 'geography');
            await module.storeFact('Dogs are loyal pets', 'animals');
        });

        it('should search facts via repository', async () => {
            const results = await module.semanticSearch('capital', 10);
            expect(Array.isArray(results)).toBe(true);
        });

        it('should respect limit parameter', async () => {
            await module.storeFact('Capital cities are important', 'test');
            const results = await module.semanticSearch('capital', 1);
            expect(results.length).toBeLessThanOrEqual(1);
        });
    });

    describe('getAllFacts', () => {
        beforeEach(() => {
            module.init(brain);
        });

        it('should return all stored facts', async () => {
            await module.storeFact('Fact one', 'test');
            await module.storeFact('Fact two', 'test');
            await module.storeFact('Fact three', 'test');

            const facts = await module.getAllFacts();
            expect(facts.length).toBe(3);
        });

        it('should return facts ordered by updated_at desc', async () => {
            await module.storeFact('Old fact', 'test');
            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
            await module.storeFact('New fact', 'test');

            const facts = await module.getAllFacts();
            expect(facts[0].fact).toBe('New fact');
        });
    });

    describe('shutdown', () => {
        it('should not throw on shutdown', async () => {
            module.init(brain);
            await module.storeFact('Test', 'test');
            await expect(module.shutdown()).resolves.not.toThrow();
        });
    });
});

describe('KnowledgeModule with semantic search', () => {
    let module: KnowledgeModule;
    let brain: Brain;
    let mockOllama: Ollama;
    let mockRepository: IKnowledgeRepository<PrismaService>;

    beforeEach(() => {
        mockOllama = createMockOllama();
        brain = new Brain();
        brain.setRuntime(createTestRuntime(mockOllama));
        mockRepository = createMockKnowledgeRepository();
        module = new KnowledgeModule(mockRepository);
    });

    afterEach(async () => {
        await module.shutdown();
    });

    describe('embedding generation', () => {
        it('should generate embedding when storing a fact', async () => {
            module.init(brain);
            await module.storeFactWithEmbedding('Dogs are loyal companions', 'test');

            const facts = await module.getAllFacts();
            expect(facts.length).toBe(1);
            expect(facts[0].embedding).toBeDefined();
            expect(facts[0].embedding).toHaveLength(384);
        });

        it('should call Ollama embed with correct model', async () => {
            module.init(brain);
            await module.storeFactWithEmbedding('Cats are independent', 'test');

            expect(mockOllama.embed).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'nomic-embed-text',
                    input: 'Cats are independent',
                })
            );
        });
    });

    describe('semantic search', () => {
        beforeEach(async () => {
            module.init(brain);
            // Store facts with embeddings
            await module.storeFactWithEmbedding('The capital of France is Paris', 'geography');
            await module.storeFactWithEmbedding('The capital of Germany is Berlin', 'geography');
            await module.storeFactWithEmbedding('Dogs are loyal pets', 'animals');
            await module.storeFactWithEmbedding('Cats are independent pets', 'animals');
        });

        it('should find semantically similar facts', async () => {
            // Query about pets should find pet-related facts
            const results = await module.semanticSearch('What pets do people have?');

            expect(results.length).toBeGreaterThan(0);
            expect(results.some(f => f.fact.includes('Dogs'))).toBe(true);
            expect(results.some(f => f.fact.includes('Cats'))).toBe(true);
        });

        it('should rank semantically similar results higher', async () => {
            // Query about France should rank France fact highest
            const results = await module.semanticSearch('Where is Paris located?');

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].fact).toContain('France');
        });

        it('should return similarity scores with results', async () => {
            const results = await module.semanticSearch('capital city');

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].similarity).toBeDefined();
            expect(results[0].similarity).toBeGreaterThan(0);
            expect(results[0].similarity).toBeLessThanOrEqual(1);
        });

        it('should respect limit parameter', async () => {
            const results = await module.semanticSearch('pets', 1);
            expect(results.length).toBe(1);
        });

        it('should handle queries with punctuation gracefully', async () => {
            // This was the original bug - queries with punctuation failed
            const results = await module.semanticSearch("What's the capital of France?");

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].fact).toContain('France');
        });

        it('should find facts even when exact words do not match', async () => {
            // Store a fact about someone's pet
            await module.storeFactWithEmbedding('John has a golden retriever named Max', 'user');

            // Search using different words that are semantically related
            const results = await module.semanticSearch('Does John have any animals?');

            expect(results.some(f => f.fact.includes('golden retriever'))).toBe(true);
        });
    });

    describe('storage without embedding', () => {
        beforeEach(async () => {
            module.init(brain);
            await module.storeFactWithEmbedding('The quick brown fox jumps', 'test');
        });

        it('should store facts without embedding using storeFact', async () => {
            // Store a fact without embedding
            await module.storeFact('No embedding here', 'test');

            // Verify it was stored
            const facts = await module.getAllFacts();
            expect(facts.some((f) => f.fact === 'No embedding here')).toBe(true);
        });
    });
});
