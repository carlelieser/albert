import type { PrismaClient } from '../../generated/prisma/client';
import type { IMemoryRepository } from '../../domain/repositories/memory.repository';
import type { MemoryEntry, Session } from '../../domain/entities/memory';

export class PrismaMemoryRepository implements IMemoryRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async createSession(name?: string): Promise<Session> {
        await this.prisma.session.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });

        const session = await this.prisma.session.create({
            data: { name, isActive: true },
        });

        return {
            id: session.id,
            name: session.name,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            isActive: session.isActive,
        };
    }

    async getSession(id: string): Promise<Session | null> {
        const session = await this.prisma.session.findUnique({
            where: { id },
            include: { entries: { orderBy: { timestamp: 'asc' } } },
        });

        if (!session) return null;

        return {
            id: session.id,
            name: session.name,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            isActive: session.isActive,
            entries: session.entries.map((e) => this.mapEntry(e)),
        };
    }

    async getActiveSession(): Promise<Session | null> {
        const session = await this.prisma.session.findFirst({
            where: { isActive: true },
            include: { entries: { orderBy: { timestamp: 'asc' } } },
        });

        if (!session) return null;

        return {
            id: session.id,
            name: session.name,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            isActive: session.isActive,
            entries: session.entries.map((e) => this.mapEntry(e)),
        };
    }

    async closeSession(id: string): Promise<void> {
        await this.prisma.session.update({
            where: { id },
            data: { isActive: false },
        });
    }

    async closeAllSessions(): Promise<void> {
        await this.prisma.session.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });
    }

    async addEntry(entry: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry> {
        const created = await this.prisma.memoryEntry.create({
            data: {
                sessionId: entry.sessionId,
                role: entry.role,
                content: entry.content,
                metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
                timestamp: entry.timestamp || new Date(),
            },
        });

        return this.mapEntry(created);
    }

    async getRecentEntries(sessionId: string, limit = 20): Promise<MemoryEntry[]> {
        const entries = await this.prisma.memoryEntry.findMany({
            where: { sessionId },
            orderBy: { timestamp: 'desc' },
            take: limit,
        });

        return entries.reverse().map((e) => this.mapEntry(e));
    }

    async getAllEntries(sessionId: string): Promise<MemoryEntry[]> {
        const entries = await this.prisma.memoryEntry.findMany({
            where: { sessionId },
            orderBy: { timestamp: 'asc' },
        });

        return entries.map((e) => this.mapEntry(e));
    }

    async clearSession(sessionId: string): Promise<void> {
        await this.prisma.memoryEntry.deleteMany({
            where: { sessionId },
        });
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
