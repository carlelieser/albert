import 'dotenv/config';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';

let prisma: PrismaClient | null = null;

// Resolve the database path - handle relative file: URLs
function resolveDatabaseUrl(): string {
    const url = process.env.DATABASE_URL || 'file:./albert.db';
    if (url.startsWith('file:./')) {
        return `file:${path.join(process.cwd(), url.slice(7))}`;
    }
    return url;
}

const DB_PATH = resolveDatabaseUrl();

export function getPrismaClient(): PrismaClient {
    if (!prisma) {
        // Ensure the data directory exists
        const filePath = DB_PATH.replace('file:', '');
        const dbDir = path.dirname(filePath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        const adapter = new PrismaBetterSqlite3({ url: DB_PATH });

        prisma = new PrismaClient({
            adapter,
            log:
                process.env.NODE_ENV === 'development'
                    ? ['query', 'error', 'warn']
                    : ['error'],
        });
    }
    return prisma;
}

export async function disconnectPrisma(): Promise<void> {
    if (prisma) {
        await prisma.$disconnect();
        prisma = null;
    }
}

export { PrismaClient };
