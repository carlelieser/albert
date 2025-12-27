import { Effect } from 'effect';
import type { IKnowledgeRepository } from '../../domain/repositories/knowledge.repository';
import type { KnowledgeFact, SemanticSearchResult } from '../../domain/entities/knowledge';
import { prismaEffect, type PrismaService } from '../database/prisma.effect';
import { type DatabaseError, FactNotFoundError, FactStorageError } from '../../domain/errors';

/**
 * Prisma-based implementation of the Knowledge Repository.
 * All methods return Effects with typed errors.
 */
export class PrismaKnowledgeRepository implements IKnowledgeRepository<PrismaService> {
    storeFact(
        fact: string,
        source?: string,
        confidence = 1.0
    ): Effect.Effect<number, FactStorageError | DatabaseError, PrismaService> {
        return prismaEffect('storeFact', (prisma) =>
            prisma.knowledgeFact.upsert({
                where: { fact },
                update: { confidence, source },
                create: { fact, source, confidence },
            })
        ).pipe(
            Effect.map((result) => result.id),
            Effect.mapError((error) =>
                error._tag === 'DatabaseError'
                    ? new FactStorageError({
                          fact,
                          message: error.message,
                          cause: error.cause,
                      })
                    : error
            )
        );
    }

    storeFactWithEmbedding(
        fact: string,
        embedding: number[],
        source?: string,
        confidence = 1.0
    ): Effect.Effect<number, FactStorageError | DatabaseError, PrismaService> {
        const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);

        return prismaEffect('storeFactWithEmbedding', (prisma) =>
            prisma.knowledgeFact.upsert({
                where: { fact },
                update: { confidence, source, embedding: embeddingBuffer },
                create: { fact, source, confidence, embedding: embeddingBuffer },
            })
        ).pipe(
            Effect.map((result) => result.id),
            Effect.mapError((error) =>
                error._tag === 'DatabaseError'
                    ? new FactStorageError({
                          fact,
                          message: error.message,
                          cause: error.cause,
                      })
                    : error
            )
        );
    }

    getFact(
        id: number
    ): Effect.Effect<KnowledgeFact, FactNotFoundError | DatabaseError, PrismaService> {
        return prismaEffect('getFact', (prisma) =>
            prisma.knowledgeFact.findUnique({
                where: { id },
                include: { categories: true },
            })
        ).pipe(
            Effect.flatMap((fact) =>
                fact
                    ? Effect.succeed(this.mapFact(fact))
                    : Effect.fail(new FactNotFoundError({ factId: id }))
            )
        );
    }

    getAllFacts(
        includeEmbeddings = false
    ): Effect.Effect<KnowledgeFact[], DatabaseError, PrismaService> {
        return prismaEffect('getAllFacts', (prisma) =>
            prisma.knowledgeFact.findMany({
                orderBy: { updatedAt: 'desc' },
                include: { categories: true },
            })
        ).pipe(
            Effect.map((facts) =>
                facts.map((f) => ({
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
                }))
            )
        );
    }

    searchByEmbedding(
        queryEmbedding: number[],
        limit = 10
    ): Effect.Effect<SemanticSearchResult[], DatabaseError, PrismaService> {
        return prismaEffect('searchByEmbedding', (prisma) =>
            prisma.knowledgeFact.findMany({
                where: { embedding: { not: null } },
                include: { categories: true },
            })
        ).pipe(
            Effect.map((facts) =>
                facts
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
                    .slice(0, limit)
            )
        );
    }

    deleteFact(
        id: number
    ): Effect.Effect<void, FactNotFoundError | DatabaseError, PrismaService> {
        return prismaEffect('deleteFact', (prisma) =>
            prisma.knowledgeFact.delete({ where: { id } })
        ).pipe(
            Effect.asVoid,
            Effect.mapError((error) =>
                error._tag === 'DatabaseError' && error.message.includes('Record to delete does not exist')
                    ? new FactNotFoundError({ factId: id })
                    : error
            )
        );
    }

    updateEmbedding(
        id: number,
        embedding: number[]
    ): Effect.Effect<void, FactNotFoundError | DatabaseError, PrismaService> {
        const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);

        return prismaEffect('updateEmbedding', (prisma) =>
            prisma.knowledgeFact.update({
                where: { id },
                data: { embedding: embeddingBuffer },
            })
        ).pipe(
            Effect.asVoid,
            Effect.mapError((error) =>
                error._tag === 'DatabaseError' && error.message.includes('Record to update not found')
                    ? new FactNotFoundError({ factId: id })
                    : error
            )
        );
    }

    private mapFact(fact: {
        id: number;
        fact: string;
        source: string | null;
        confidence: number;
        embedding: Uint8Array | Buffer | null;
        createdAt: Date;
        updatedAt: Date;
        categories: Array<{ name: string }>;
    }): KnowledgeFact {
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

    private bufferToFloatArray(buffer: Uint8Array | Buffer): number[] {
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
