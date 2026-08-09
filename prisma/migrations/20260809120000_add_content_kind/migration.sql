-- AlterTable
ALTER TABLE "SourceItem" ADD COLUMN "contentKind" TEXT;
ALTER TABLE "SourceItem" ADD COLUMN "contentKindConfidence" TEXT;
ALTER TABLE "SourceItem" ADD COLUMN "contentKindReason" TEXT;
ALTER TABLE "SourceItem" ADD COLUMN "contentKindEvaluatedAt" DATETIME;

-- CreateIndex
CREATE INDEX "SourceItem_contentKindEvaluatedAt_contentType_idx" ON "SourceItem"("contentKindEvaluatedAt", "contentType");
CREATE INDEX "SourceItem_contentKind_publishedAt_idx" ON "SourceItem"("contentKind", "publishedAt");
