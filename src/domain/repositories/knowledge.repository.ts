import type { KnowledgeFact, SemanticSearchResult } from '../entities/knowledge';

export interface IKnowledgeRepository {
    storeFact: (fact: string, source?: string, confidence?: number) => Promise<number>;
    storeFactWithEmbedding: (
        fact: string,
        embedding: number[],
        source?: string,
        confidence?: number
    ) => Promise<number>;
    getFact: (id: number) => Promise<KnowledgeFact | null>;
    getAllFacts: (includeEmbeddings?: boolean) => Promise<KnowledgeFact[]>;
    searchByEmbedding: (embedding: number[], limit?: number) => Promise<SemanticSearchResult[]>;
    deleteFact: (id: number) => Promise<boolean>;
    updateEmbedding: (id: number, embedding: number[]) => Promise<void>;
}
