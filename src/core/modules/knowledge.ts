import { Effect } from 'effect';
import { BaseModule } from './base';
import type { BrainEvent } from '../brain';
import { Events } from '../events';
import type { IKnowledgeRepository } from '../../domain/repositories/knowledge.repository';
import type { KnowledgeFact, SemanticSearchResult } from '../../domain/entities/knowledge';
import type { PrismaService } from '../../infrastructure/database/prisma.effect';
import { ollamaEmbed, ollamaChat } from '../../infrastructure/services/ollama.effect';
import type { AppServices } from '../../infrastructure/layers';
import { config } from '../../config';

interface KnowledgeStorePayload {
    fact: string;
    source?: string;
    confidence?: number;
}

interface KnowledgeQueryPayload {
    query: string;
    requestId: string;
    limit?: number;
}

const EMBEDDING_MODEL = 'nomic-embed-text';

export class KnowledgeModule extends BaseModule {
    constructor(
        private readonly repository: IKnowledgeRepository<PrismaService>
    ) {
        super('knowledge');
    }

    registerListeners(): void {
        if (!this.brain) return;

        this.brain.on(Events.KnowledgeStore, (event: BrainEvent) => {
            const payload = event.data as KnowledgeStorePayload;
            this.forkEffect(this.handleStoreEffect(payload));
        });

        this.brain.on(Events.KnowledgeQuery, (event: BrainEvent) => {
            const payload = event.data as KnowledgeQueryPayload;
            this.forkEffect(this.handleQueryEffect(payload));
        });

        this.brain.on(Events.InputReceived, (event: BrainEvent) => {
            const payload = event.data as { text: string };
            this.forkEffect(this.handleDismissalsEffect(payload.text));
            this.forkEffect(this.extractFactsEffect(payload.text));
        });
    }

    private handleStoreEffect(
        payload: KnowledgeStorePayload
    ): Effect.Effect<void, never, AppServices> {
        return Effect.gen(this, function* () {
            const embedding = yield* ollamaEmbed(EMBEDDING_MODEL, payload.fact);
            yield* this.repository.storeFactWithEmbedding(
                payload.fact,
                embedding,
                payload.source ?? 'unknown',
                payload.confidence ?? 1.0
            );
        }).pipe(
            Effect.catchAll(() => Effect.void)
        );
    }

    private handleQueryEffect(
        payload: KnowledgeQueryPayload
    ): Effect.Effect<void, never, AppServices> {
        return Effect.gen(this, function* () {
            const embedding = yield* ollamaEmbed(EMBEDDING_MODEL, payload.query);
            return yield* this.repository.searchByEmbedding(
                embedding,
                payload.limit ?? 10
            );
        }).pipe(
            Effect.tap((facts) =>
                Effect.sync(() =>
                    this.brain!.emit(Events.KnowledgeResult, {
                        requestId: payload.requestId,
                        facts,
                    })
                )
            ),
            Effect.catchAll(() =>
                Effect.sync(() =>
                    this.brain!.emit(Events.KnowledgeResult, {
                        requestId: payload.requestId,
                        facts: [],
                    })
                )
            ),
            Effect.asVoid
        );
    }

    private handleDismissalsEffect(
        input: string
    ): Effect.Effect<void, never, AppServices> {
        return Effect.gen(this, function* () {
            const facts = yield* this.repository.getAllFacts();
            if (facts.length === 0) return;

            const factsWithIds = facts.map((f) => ({ id: f.id, fact: f.fact }));

            const response = yield* ollamaChat({
                model: config.ollama.models.helper,
                messages: [
                    {
                        role: 'system',
                        content:
                            'You analyze user messages to determine if any stored facts should be deleted. Return the IDs of facts to delete, or an empty array if none.',
                    },
                    {
                        role: 'user',
                        content: `User message: "${input}"\n\nStored facts:\n${JSON.stringify(factsWithIds, null, 2)}`,
                    },
                ],
                format: {
                    type: 'object',
                    properties: {
                        deleteIds: {
                            type: 'array',
                            items: { type: 'number' },
                            description: 'IDs of facts to delete based on user dismissal or correction',
                        },
                    },
                    required: ['deleteIds'],
                },
            });

            const parsed = JSON.parse(response.message.content) as { deleteIds: number[] };
            yield* Effect.forEach(
                parsed.deleteIds,
                (id) => this.repository.deleteFact(id).pipe(Effect.catchAll(() => Effect.void)),
                { discard: true }
            );
        }).pipe(
            Effect.catchAll(() => Effect.void)
        );
    }

    private extractFactsEffect(
        userInput: string
    ): Effect.Effect<void, never, AppServices> {
        return Effect.gen(this, function* () {
            const response = yield* ollamaChat({
                model: config.ollama.models.helper,
                messages: [
                    {
                        role: 'system',
                        content: 'Extract any personal facts about the user from their message (name, preferences, occupation, location, etc.). Each fact should be a complete sentence.',
                    },
                    { role: 'user', content: userInput },
                ],
                format: {
                    type: 'object',
                    properties: {
                        facts: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'List of personal facts extracted from the message, or empty if none found',
                        },
                    },
                    required: ['facts'],
                },
            });

            const parsed = JSON.parse(response.message.content) as { facts: string[] };
            yield* Effect.forEach(
                parsed.facts.filter((fact) => fact && fact.length > 0),
                (fact) =>
                    Effect.sync(() =>
                        this.brain!.emit(Events.KnowledgeStore, {
                            fact,
                            source: 'user',
                            confidence: 0.9,
                        })
                    ),
                { discard: true }
            );
        }).pipe(
            Effect.catchAll(() => Effect.void)
        );
    }

    storeFactEffect(
        fact: string,
        source: string | null = null,
        confidence: number = 1.0
    ): Effect.Effect<number, never, AppServices> {
        return this.repository.storeFact(fact, source ?? undefined, confidence).pipe(
            Effect.catchAll(() => Effect.succeed(-1))
        );
    }

    async storeFact(
        fact: string,
        source: string | null = null,
        confidence: number = 1.0
    ): Promise<number> {
        return await this.runEffect(this.storeFactEffect(fact, source, confidence));
    }

    storeFactWithEmbeddingEffect(
        fact: string,
        source: string | null = null,
        confidence: number = 1.0
    ): Effect.Effect<number, never, AppServices> {
        return Effect.gen(this, function* () {
            const embedding = yield* ollamaEmbed(EMBEDDING_MODEL, fact);
            return yield* this.repository.storeFactWithEmbedding(
                fact,
                embedding,
                source ?? undefined,
                confidence
            );
        }).pipe(
            Effect.catchAll(() => Effect.succeed(-1))
        );
    }

    async storeFactWithEmbedding(
        fact: string,
        source: string | null = null,
        confidence: number = 1.0
    ): Promise<number> {
        return await this.runEffect(this.storeFactWithEmbeddingEffect(fact, source, confidence));
    }

    semanticSearchEffect(
        query: string,
        limit: number = 10
    ): Effect.Effect<SemanticSearchResult[], never, AppServices> {
        return Effect.gen(this, function* () {
            const embedding = yield* ollamaEmbed(EMBEDDING_MODEL, query);
            return yield* this.repository.searchByEmbedding(embedding, limit);
        }).pipe(
            Effect.catchAll(() => Effect.succeed([]))
        );
    }

    async semanticSearch(
        query: string,
        limit: number = 10
    ): Promise<SemanticSearchResult[]> {
        return await this.runEffect(this.semanticSearchEffect(query, limit));
    }

    getAllFactsEffect(
        includeEmbeddings = false
    ): Effect.Effect<KnowledgeFact[], never, AppServices> {
        return this.repository.getAllFacts(includeEmbeddings).pipe(
            Effect.catchAll(() => Effect.succeed([]))
        );
    }

    async getAllFacts(includeEmbeddings = false): Promise<KnowledgeFact[]> {
        return await this.runEffect(this.getAllFactsEffect(includeEmbeddings));
    }

    getFactEffect(id: number): Effect.Effect<KnowledgeFact | null, never, AppServices> {
        return this.repository.getFact(id).pipe(
            Effect.catchTag('FactNotFoundError', () => Effect.succeed(null)),
            Effect.catchAll(() => Effect.succeed(null))
        );
    }

    async getFact(id: number): Promise<KnowledgeFact | null> {
        return await this.runEffect(this.getFactEffect(id));
    }

    deleteFactEffect(id: number): Effect.Effect<boolean, never, AppServices> {
        return this.repository.deleteFact(id).pipe(
            Effect.map(() => true),
            Effect.catchTag('FactNotFoundError', () => Effect.succeed(false)),
            Effect.catchAll(() => Effect.succeed(false))
        );
    }

    async deleteFact(id: number): Promise<boolean> {
        return await this.runEffect(this.deleteFactEffect(id));
    }

    async shutdown(): Promise<void> {
        // No cleanup needed
    }
}

export type { KnowledgeFact, SemanticSearchResult };
