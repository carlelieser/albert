export interface KnowledgeFact {
    id: number;
    fact: string;
    source: string | null;
    confidence: number;
    embedding?: number[];
    createdAt: Date;
    updatedAt: Date;
    categories?: string[];
}

export interface SemanticSearchResult extends KnowledgeFact {
    similarity: number;
}
