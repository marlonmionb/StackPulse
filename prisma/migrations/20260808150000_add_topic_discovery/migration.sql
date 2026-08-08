-- AlterTable
ALTER TABLE "Topic" ADD COLUMN "profileRelevanceScore" REAL;
ALTER TABLE "Topic" ADD COLUMN "technicalDepthScore" REAL;
ALTER TABLE "Topic" ADD COLUMN "freshnessScore" REAL;
ALTER TABLE "Topic" ADD COLUMN "contentPotentialScore" REAL;
ALTER TABLE "Topic" ADD COLUMN "rankingReason" TEXT;
ALTER TABLE "Topic" ADD COLUMN "discoverySignature" TEXT;
ALTER TABLE "Topic" ADD COLUMN "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "TopicSourceItem" (
    "topicId" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TopicSourceItem_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TopicSourceItem_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "SourceItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("topicId", "sourceItemId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_discoverySignature_key" ON "Topic"("discoverySignature");
CREATE INDEX "TopicSourceItem_sourceItemId_idx" ON "TopicSourceItem"("sourceItemId");
