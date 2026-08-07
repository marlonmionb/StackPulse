-- Existing rows remain intact with a null canonical URL. The ingestion service
-- canonicalizes their original URLs when checking for duplicates.
ALTER TABLE "SourceItem" ADD COLUMN "canonicalUrl" TEXT;

CREATE UNIQUE INDEX "SourceItem_canonicalUrl_key" ON "SourceItem"("canonicalUrl");
