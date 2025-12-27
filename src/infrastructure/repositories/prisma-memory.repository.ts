import { Effect } from 'effect';
import type { IMemoryRepository } from '../../domain/repositories/memory.repository';
import type { MemoryEntry, Session } from '../../domain/entities/memory';
import { prismaEffect, prismaTransaction, type PrismaService } from '../database/prisma.effect';
import {
    type DatabaseError,
    SessionNotFoundError,
    NoActiveSessionError,
    SessionCreationError,
    MemoryEntryError,
} from '../../domain/errors';

/**
 * Prisma-based implementation of the Memory Repository.
 * All methods return Effects with typed errors.
 */
export class PrismaMemoryRepository implements IMemoryRepository<PrismaService> {
    createSession(
        name?: string
    ): Effect.Effect<Session, SessionCreationError | DatabaseError, PrismaService> {
        return prismaTransaction('createSession', async (tx) => {
            // Deactivate all existing active sessions
            await tx.session.updateMany({
                where: { isActive: true },
                data: { isActive: false },
            });

            // Create new active session
            const session = await tx.session.create({
                data: { name, isActive: true },
            });

            return {
                id: session.id,
                name: session.name,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                isActive: session.isActive,
            };
        }).pipe(
            Effect.mapError((error) =>
                error._tag === 'DatabaseError'
                    ? new SessionCreationError({
                          message: error.message,
                          cause: error.cause,
                      })
                    : error
            )
        );
    }

    getSession(
        id: string
    ): Effect.Effect<Session, SessionNotFoundError | DatabaseError, PrismaService> {
        return prismaEffect('getSession', (prisma) =>
            prisma.session.findUnique({
                where: { id },
                include: { entries: { orderBy: { timestamp: 'asc' } } },
            })
        ).pipe(
            Effect.flatMap((session) =>
                session
                    ? Effect.succeed(this.mapSession(session))
                    : Effect.fail(new SessionNotFoundError({ sessionId: id }))
            )
        );
    }

    getActiveSession(): Effect.Effect<
        Session,
        NoActiveSessionError | DatabaseError,
        PrismaService
    > {
        return prismaEffect('getActiveSession', (prisma) =>
            prisma.session.findFirst({
                where: { isActive: true },
                include: { entries: { orderBy: { timestamp: 'asc' } } },
            })
        ).pipe(
            Effect.flatMap((session) =>
                session
                    ? Effect.succeed(this.mapSession(session))
                    : Effect.fail(new NoActiveSessionError())
            )
        );
    }

    closeSession(
        id: string
    ): Effect.Effect<void, SessionNotFoundError | DatabaseError, PrismaService> {
        return prismaEffect('closeSession', (prisma) =>
            prisma.session.update({
                where: { id },
                data: { isActive: false },
            })
        ).pipe(
            Effect.asVoid,
            Effect.mapError((error) =>
                error._tag === 'DatabaseError' && error.message.includes('Record to update not found')
                    ? new SessionNotFoundError({ sessionId: id })
                    : error
            )
        );
    }

    closeAllSessions(): Effect.Effect<void, DatabaseError, PrismaService> {
        return prismaEffect('closeAllSessions', (prisma) =>
            prisma.session.updateMany({
                where: { isActive: true },
                data: { isActive: false },
            })
        ).pipe(Effect.asVoid);
    }

    addEntry(
        entry: Omit<MemoryEntry, 'id'>
    ): Effect.Effect<MemoryEntry, MemoryEntryError | DatabaseError, PrismaService> {
        return prismaEffect('addEntry', (prisma) =>
            prisma.memoryEntry.create({
                data: {
                    sessionId: entry.sessionId,
                    role: entry.role,
                    content: entry.content,
                    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
                    timestamp: entry.timestamp || new Date(),
                },
            })
        ).pipe(
            Effect.map((created) => this.mapEntry(created)),
            Effect.mapError((error) =>
                error._tag === 'DatabaseError'
                    ? new MemoryEntryError({
                          operation: 'add',
                          message: error.message,
                          cause: error.cause,
                      })
                    : error
            )
        );
    }

    getRecentEntries(
        sessionId: string,
        limit = 20
    ): Effect.Effect<MemoryEntry[], DatabaseError, PrismaService> {
        return prismaEffect('getRecentEntries', (prisma) =>
            prisma.memoryEntry.findMany({
                where: { sessionId },
                orderBy: { timestamp: 'desc' },
                take: limit,
            })
        ).pipe(Effect.map((entries) => entries.reverse().map((e) => this.mapEntry(e))));
    }

    getAllEntries(sessionId: string): Effect.Effect<MemoryEntry[], DatabaseError, PrismaService> {
        return prismaEffect('getAllEntries', (prisma) =>
            prisma.memoryEntry.findMany({
                where: { sessionId },
                orderBy: { timestamp: 'asc' },
            })
        ).pipe(Effect.map((entries) => entries.map((e) => this.mapEntry(e))));
    }

    clearSession(sessionId: string): Effect.Effect<void, DatabaseError, PrismaService> {
        return prismaEffect('clearSession', (prisma) =>
            prisma.memoryEntry.deleteMany({
                where: { sessionId },
            })
        ).pipe(Effect.asVoid);
    }

    private mapSession(session: {
        id: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        entries: Array<{
            id: number;
            sessionId: string;
            role: string;
            content: string;
            metadata: string | null;
            timestamp: Date;
        }>;
    }): Session {
        return {
            id: session.id,
            name: session.name,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            isActive: session.isActive,
            entries: session.entries.map((e) => this.mapEntry(e)),
        };
    }

    private mapEntry(e: {
        id: number;
        sessionId: string;
        role: string;
        content: string;
        metadata: string | null;
        timestamp: Date;
    }): MemoryEntry {
        return {
            id: e.id,
            sessionId: e.sessionId,
            role: e.role as MemoryEntry['role'],
            content: e.content,
            timestamp: e.timestamp,
            metadata: e.metadata ? JSON.parse(e.metadata) : undefined,
        };
    }
}
