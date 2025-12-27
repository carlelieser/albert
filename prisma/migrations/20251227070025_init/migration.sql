-- CreateTable
CREATE TABLE "knowledge" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fact" TEXT NOT NULL,
    "source" TEXT,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "embedding" BLOB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "memory_entries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "memory_entries_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "personality_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'default',
    "formality" REAL NOT NULL DEFAULT 0.3,
    "verbosity" REAL NOT NULL DEFAULT 0.4,
    "warmth" REAL NOT NULL DEFAULT 0.7,
    "humor" REAL NOT NULL DEFAULT 0.3,
    "confidence" REAL NOT NULL DEFAULT 0.6,
    "useEmoji" BOOLEAN NOT NULL DEFAULT false,
    "preferBulletPoints" BOOLEAN NOT NULL DEFAULT false,
    "askFollowUpQuestions" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_KnowledgeCategories" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_KnowledgeCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_KnowledgeCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "knowledge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_fact_key" ON "knowledge"("fact");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "memory_entries_sessionId_timestamp_idx" ON "memory_entries"("sessionId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "personality_profiles_name_key" ON "personality_profiles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_KnowledgeCategories_AB_unique" ON "_KnowledgeCategories"("A", "B");

-- CreateIndex
CREATE INDEX "_KnowledgeCategories_B_index" ON "_KnowledgeCategories"("B");
