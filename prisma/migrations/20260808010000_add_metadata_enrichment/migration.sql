-- AlterTable
ALTER TABLE "SourceItem" ADD COLUMN "metadataEnrichmentStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "SourceItem" ADD COLUMN "metadataEnrichmentAttemptedAt" DATETIME;

-- CreateIndex
CREATE INDEX "SourceItem_metadataEnrichmentStatus_contentType_idx"
ON "SourceItem"("metadataEnrichmentStatus", "contentType");
