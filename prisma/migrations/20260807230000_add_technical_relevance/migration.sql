-- AlterTable
ALTER TABLE "SourceItem" ADD COLUMN "technicalRelevant" BOOLEAN;
ALTER TABLE "SourceItem" ADD COLUMN "technicalRelevanceScore" INTEGER;
ALTER TABLE "SourceItem" ADD COLUMN "technicalCategory" TEXT;
ALTER TABLE "SourceItem" ADD COLUMN "technicalRelevanceReason" TEXT;
ALTER TABLE "SourceItem" ADD COLUMN "technicalRelevanceEvaluatedAt" DATETIME;

-- CreateIndex
CREATE INDEX "SourceItem_technicalRelevanceEvaluatedAt_contentType_idx"
ON "SourceItem"("technicalRelevanceEvaluatedAt", "contentType");

-- CreateIndex
CREATE INDEX "SourceItem_technicalRelevant_publishedAt_idx"
ON "SourceItem"("technicalRelevant", "publishedAt");
