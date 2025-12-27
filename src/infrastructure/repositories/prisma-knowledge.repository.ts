import type { PrismaClient } from '../../generated/prisma/client';
import type { IKnowledgeRepository } from '../../domain/repositories/knowledge.repository';
import type { KnowledgeFact, SemanticSearchResult } from '../../domain/entities/knowledge';

export class PrismaKnowledgeRepository implements IKnowledgeRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async storeFact(fact: string, source?: string, confidence = 1.0): Promise<number> {
        const result = await this.prisma.knowledgeFact.upsert({
            where: { fact },
            update: { confidence, source },
            create: { fact, source, confidence },
        });
        return result.id;
    }

    async storeFactWithEmbedding(
        fact: string,
        embedding: number[],
        source?: string,
        confidence = 1.0
    ): Promise<number> {
        const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);

        const result = await this.prisma.knowledgeFact.upsert({
            where: { fact },
            update: { confidence, source, embedding: embeddingBuffer },
            create: { fact, source, confidence, embedding: embeddingBuffer },
        });
        return result.id;
    }

    async getFact(id: number): Promise<KnowledgeFact | null> {
        const fact = await this.prisma.knowledgeFact.findUnique({
            where: { id },
            include: { categories: true },
        });

        if (!fact) return null;

        return {
            id: fact.id,
            fact: fact.fact,
            source: fact.source,
            confidence: fact.confidence,
            embedding: fact.embedding ? this.bufferToFloatArray(fact.embedding) : undefined,
            createdAt: fact.createdAt,
            updatedAt: fact.updatedAt,
            categories: fact.categories.map((c) => c.name),
        };
    }

    async getAllFacts(includeEmbeddings = false): Promise<KnowledgeFact[]> {
        const facts = await this.prisma.knowledgeFact.findMany({
            orderBy: { updatedAt: 'desc' },
            include: { categories: true },
        });

        return facts.map((f) => ({
            id: f.id,
            fact: f.fact,
            source: f.source,
            confidence: f.confidence,
            embedding:
                includeEmbeddings && f.embedding
                    ? this.bufferToFloatArray(f.embedding)
                    : undefined,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt,
            categories: f.categories.map((c) => c.name),
        }));
    }

    async searchByEmbedding(
        queryEmbedding: number[],
        limit = 10
    ): Promise<SemanticSearchResult[]> {
        const facts = await this.prisma.knowledgeFact.findMany({
            where: { embedding: { not: null } },
            include: { categories: true },
        });

        const results = facts
            .map((f) => {
                const embedding = this.bufferToFloatArray(f.embedding!);
                const similarity = this.cosineSimilarity(queryEmbedding, embedding);
                return {
                    id: f.id,
                    fact: f.fact,
                    source: f.source,
                    confidence: f.confidence,
                    embedding,
                    createdAt: f.createdAt,
                    updatedAt: f.updatedAt,
                    categories: f.categories.map((c) => c.name),
                    similarity,
                };
            })
            .filter((r) => r.similarity > 0.5)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        return results;
    }

    async deleteFact(id: number): Promise<boolean> {
        try {
            await this.prisma.knowledgeFact.delete({ where: { id } });
            return true;
        } catch {
            return false;
        }
    }

    async updateEmbedding(id: number, embedding: number[]): Promise<void> {
        const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);
        await this.prisma.knowledgeFact.update({
            where: { id },
            data: { embedding: embeddingBuffer },
        });
    }

    private bufferToFloatArray(buffer: Buffer): number[] {
        const floatArray = new Float32Array(
            buffer.buffer,
            buffer.byteOffset,
            buffer.length / 4
        );
        return Array.from(floatArray);
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;
        let dot = 0;
            let normA = 0;
            let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const mag = Math.sqrt(normA) * Math.sqrt(normB);
        return mag === 0 ? 0 : dot / mag;
    }
}
