import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { Ollama } from 'ollama';
import { BaseModule } from './base';
import type { Brain, BrainEvent } from '../brain';
import { Events } from '../events';

export interface KnowledgeFact {
    id: number;
    fact: string;
    source: string | null;
    confidence: number;
    createdAt: number;
    updatedAt: number;
}

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

export class KnowledgeModule extends BaseModule {
    private db: DatabaseType | null = null;
    private readonly dbPath: string;

    constructor(ollama: Ollama, dbPath: string = './albert.db') {
        super(ollama, 'knowledge');
        this.dbPath = dbPath;
    }

    registerListeners(): void {
        if (!this.brain) return;

        this.brain.on(Events.KnowledgeStore, (event: BrainEvent) => {
            const payload = event.data as KnowledgeStorePayload;
            this.storeFact(payload.fact, payload.source ?? 'unknown', payload.confidence ?? 1.0);
        });

        this.brain.on(Events.KnowledgeQuery, (event: BrainEvent) => {
            const payload = event.data as KnowledgeQueryPayload;
            const facts = this.search(payload.query, payload.limit);

            this.brain!.emit(Events.KnowledgeResult, {
                requestId: payload.requestId,
                facts,
            });
        });
    }

    init(brain: Brain): void {
        super.init(brain);
        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL');
        this.createTables();
    }

    private createTables(): void {
        if (!this.db) return;

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS knowledge (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fact TEXT NOT NULL UNIQUE,
                source TEXT,
                confidence REAL DEFAULT 1.0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS knowledge_categories (
                knowledge_id INTEGER REFERENCES knowledge(id) ON DELETE CASCADE,
                category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
                PRIMARY KEY (knowledge_id, category_id)
            );
        `);

        // Create FTS table if it doesn't exist
        try {
            this.db.exec(`
                CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts
                USING fts5(fact, content=knowledge, content_rowid=id);
            `);
        } catch {
            // FTS table might already exist
        }

        // Create triggers for FTS sync
        this.db.exec(`
            CREATE TRIGGER IF NOT EXISTS knowledge_ai AFTER INSERT ON knowledge BEGIN
                INSERT INTO knowledge_fts(rowid, fact) VALUES (new.id, new.fact);
            END;

            CREATE TRIGGER IF NOT EXISTS knowledge_ad AFTER DELETE ON knowledge BEGIN
                INSERT INTO knowledge_fts(knowledge_fts, rowid, fact)
                VALUES('delete', old.id, old.fact);
            END;

            CREATE TRIGGER IF NOT EXISTS knowledge_au AFTER UPDATE ON knowledge BEGIN
                INSERT INTO knowledge_fts(knowledge_fts, rowid, fact)
                VALUES('delete', old.id, old.fact);
                INSERT INTO knowledge_fts(rowid, fact) VALUES (new.id, new.fact);
            END;
        `);
    }

    storeFact(fact: string, source: string | null = null, confidence: number = 1.0): number {
        if (!this.db) throw new Error('Database not initialized');

        const now = Date.now();
        const stmt = this.db.prepare(`
            INSERT INTO knowledge (fact, source, confidence, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(fact) DO UPDATE SET
                confidence = excluded.confidence,
                updated_at = excluded.updated_at
        `);

        const result = stmt.run(fact, source, confidence, now, now);
        return result.lastInsertRowid as number;
    }

    search(query: string, limit: number = 10): KnowledgeFact[] {
        if (!this.db) return [];

        try {
            const stmt = this.db.prepare(`
                SELECT k.id, k.fact, k.source, k.confidence,
                       k.created_at as createdAt, k.updated_at as updatedAt
                FROM knowledge_fts
                JOIN knowledge k ON knowledge_fts.rowid = k.id
                WHERE knowledge_fts MATCH ?
                ORDER BY rank
                LIMIT ?
            `);

            return stmt.all(query, limit) as KnowledgeFact[];
        } catch {
            // Fallback to LIKE search if FTS fails
            const stmt = this.db.prepare(`
                SELECT id, fact, source, confidence,
                       created_at as createdAt, updated_at as updatedAt
                FROM knowledge
                WHERE fact LIKE ?
                ORDER BY updated_at DESC
                LIMIT ?
            `);

            return stmt.all(`%${query}%`, limit) as KnowledgeFact[];
        }
    }

    getAllFacts(): KnowledgeFact[] {
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            SELECT id, fact, source, confidence,
                   created_at as createdAt, updated_at as updatedAt
            FROM knowledge
            ORDER BY updated_at DESC
        `);

        return stmt.all() as KnowledgeFact[];
    }

    async shutdown(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}
