/**
 * Migration script to copy data from legacy better-sqlite3 database to Prisma
 * Run with: npx vite-node scripts/migrate-legacy-data.ts
 */

import 'dotenv/config';
import Database from 'better-sqlite3';
import { getPrismaClient, disconnectPrisma } from '../src/infrastructure/database/prisma';

const LEGACY_DB_PATH = './albert.db.old';

interface LegacyKnowledgeFact {
    id: number;
    fact: string;
    source: string | null;
    confidence: number;
    embedding: Buffer | null;
    created_at: number;
    updated_at: number;
}

interface LegacyCategory {
    id: number;
    name: string;
}

async function migrateLegacyData(): Promise<void> {
    console.log('Starting legacy data migration...\n');

    // Check if legacy database exists
    const fs = await import('fs');
    if (!fs.existsSync(LEGACY_DB_PATH)) {
        console.log(`Legacy database not found at ${LEGACY_DB_PATH}`);
        console.log('No data to migrate.');
        return;
    }

    const legacyDb = new Database(LEGACY_DB_PATH, { readonly: true });
    const prisma = getPrismaClient();

    try {
        // 1. Migrate knowledge facts
        console.log('Migrating knowledge facts...');
        const facts = legacyDb
            .prepare(
                `SELECT id, fact, source, confidence, embedding, created_at, updated_at
                 FROM knowledge`
            )
            .all() as LegacyKnowledgeFact[];

        console.log(`  Found ${facts.length} facts to migrate`);

        let migratedFacts = 0;
        for (const fact of facts) {
            try {
                await prisma.knowledgeFact.upsert({
                    where: { fact: fact.fact },
                    update: {},
                    create: {
                        fact: fact.fact,
                        source: fact.source,
                        confidence: fact.confidence,
                        embedding: fact.embedding,
                        createdAt: new Date(fact.created_at),
                        updatedAt: new Date(fact.updated_at),
                    },
                });
                migratedFacts++;
            } catch (err) {
                console.log(`  Skipping duplicate fact: "${fact.fact.substring(0, 50)}..."`);
            }
        }
        console.log(`  Migrated ${migratedFacts} facts\n`);

        // 2. Migrate categories
        console.log('Migrating categories...');
        const categories = legacyDb
            .prepare('SELECT id, name FROM categories')
            .all() as LegacyCategory[];

        console.log(`  Found ${categories.length} categories to migrate`);

        let migratedCategories = 0;
        for (const cat of categories) {
            try {
                await prisma.category.upsert({
                    where: { name: cat.name },
                    update: {},
                    create: { name: cat.name },
                });
                migratedCategories++;
            } catch (err) {
                console.log(`  Skipping duplicate category: "${cat.name}"`);
            }
        }
        console.log(`  Migrated ${migratedCategories} categories\n`);

        // 3. Create default personality profile
        console.log('Creating default personality profile...');
        await prisma.personalityProfile.upsert({
            where: { name: 'default' },
            update: {},
            create: {
                name: 'default',
                formality: 0.3,
                verbosity: 0.4,
                warmth: 0.7,
                humor: 0.3,
                confidence: 0.6,
                useEmoji: false,
                preferBulletPoints: false,
                askFollowUpQuestions: true,
            },
        });
        console.log('  Default personality profile created\n');

        console.log('Migration completed successfully!');
        console.log('\nSummary:');
        console.log(`  - ${migratedFacts} knowledge facts migrated`);
        console.log(`  - ${migratedCategories} categories migrated`);
        console.log('  - Default personality profile created');
    } finally {
        legacyDb.close();
        await disconnectPrisma();
    }
}

migrateLegacyData().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
