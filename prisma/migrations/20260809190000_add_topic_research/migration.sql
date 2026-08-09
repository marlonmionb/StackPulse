-- AlterTable
ALTER TABLE "AiUsage" ADD COLUMN "reasoningTokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AiUsage" ADD COLUMN "webSearchCalls" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AiUsage" ADD COLUMN "estimatedTokenCostUsd" REAL;
ALTER TABLE "AiUsage" ADD COLUMN "estimatedToolCostUsd" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "score" REAL,
    "profileRelevanceScore" REAL,
    "technicalDepthScore" REAL,
    "freshnessScore" REAL,
    "contentPotentialScore" REAL,
    "rankingReason" TEXT,
    "discoverySignature" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Topic" SELECT "id", "title", "description", "score", "profileRelevanceScore", "technicalDepthScore", "freshnessScore", "contentPotentialScore", "rankingReason", "discoverySignature", "status", "discoveredAt", "createdAt", "updatedAt" FROM "Topic";
DROP TABLE "Topic";
ALTER TABLE "new_Topic" RENAME TO "Topic";
CREATE UNIQUE INDEX "Topic_discoverySignature_key" ON "Topic"("discoverySignature");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "TopicResearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "keyFindings" JSONB NOT NULL,
    "technicalDetails" JSONB NOT NULL,
    "tradeoffs" JSONB NOT NULL,
    "practicalImplications" JSONB NOT NULL,
    "openQuestions" JSONB NOT NULL,
    "limitations" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "webSearchCalls" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedTokenCostUsd" REAL,
    "estimatedToolCostUsd" REAL,
    "estimatedTotalCostUsd" REAL,
    "researchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TopicResearch_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TopicResearchSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "researchId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "publisher" TEXT,
    "domain" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TopicResearchSource_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "TopicResearch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TopicResearch_topicId_researchedAt_idx" ON "TopicResearch"("topicId", "researchedAt");
CREATE INDEX "TopicResearchSource_researchId_idx" ON "TopicResearchSource"("researchId");
CREATE UNIQUE INDEX "TopicResearchSource_researchId_evidenceId_key" ON "TopicResearchSource"("researchId", "evidenceId");
CREATE UNIQUE INDEX "TopicResearchSource_researchId_canonicalUrl_key" ON "TopicResearchSource"("researchId", "canonicalUrl");
