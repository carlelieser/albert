import { type Effect } from 'effect';
import type { KnowledgeFact, SemanticSearchResult } from '../entities/knowledge';
import type { DatabaseError, FactNotFoundError, FactStorageError } from '../errors';

/**
 * Effect-based Knowledge Repository interface.
 * All methods return Effects with typed errors.
 *
 * @typeParam R - The requirements/context type (e.g., PrismaService)
 */
export interface IKnowledgeRepository<R = never> {
    /**
     * Stores a fact without embedding.
     * @returns The ID of the stored fact
     */
    storeFact: (
        fact: string,
        source?: string,
        confidence?: number
    ) => Effect.Effect<number, FactStorageError | DatabaseError, R>;

    /**
     * Stores a fact with its embedding vector.
     * @returns The ID of the stored fact
     */
    storeFactWithEmbedding: (
        fact: string,
        embedding: number[],
        source?: string,
        confidence?: number
    ) => Effect.Effect<number, FactStorageError | DatabaseError, R>;

    /**
     * Retrieves a fact by ID.
     * @returns The fact if found
     */
    getFact: (id: number) => Effect.Effect<KnowledgeFact, FactNotFoundError | DatabaseError, R>;

    /**
     * Retrieves all facts.
     * @param includeEmbeddings - Whether to include embedding vectors
     */
    getAllFacts: (includeEmbeddings?: boolean) => Effect.Effect<KnowledgeFact[], DatabaseError, R>;

    /**
     * Searches for facts by embedding similarity.
     * @param embedding - Query embedding vector
     * @param limit - Maximum number of results
     */
    searchByEmbedding: (
        embedding: number[],
        limit?: number
    ) => Effect.Effect<SemanticSearchResult[], DatabaseError, R>;

    /**
     * Deletes a fact by ID.
     */
    deleteFact: (id: number) => Effect.Effect<void, FactNotFoundError | DatabaseError, R>;

    /**
     * Updates the embedding for a fact.
     */
    updateEmbedding: (
        id: number,
        embedding: number[]
    ) => Effect.Effect<void, FactNotFoundError | DatabaseError, R>;
}
