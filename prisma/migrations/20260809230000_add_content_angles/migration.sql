-- CreateTable
CREATE TABLE "ContentAngle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicResearchId" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thesis" TEXT NOT NULL,
    "authorConnectionType" TEXT NOT NULL,
    "whyItFitsAuthor" TEXT NOT NULL,
    "fitScore" INTEGER NOT NULL,
    "requiresHumanInput" BOOLEAN NOT NULL DEFAULT false,
    "humanInputPrompt" TEXT,
    "claimBoundaryNotes" TEXT NOT NULL,
    "authorProfileHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "model" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentAngle_topicResearchId_fkey" FOREIGN KEY ("topicResearchId") REFERENCES "TopicResearch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentAngleSource" (
    "angleId" TEXT NOT NULL,
    "researchSourceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("angleId", "researchSourceId"),
    CONSTRAINT "ContentAngleSource_angleId_fkey" FOREIGN KEY ("angleId") REFERENCES "ContentAngle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContentAngleSource_researchSourceId_fkey" FOREIGN KEY ("researchSourceId") REFERENCES "TopicResearchSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ContentAngle_topicResearchId_generatedAt_idx" ON "ContentAngle"("topicResearchId", "generatedAt");
CREATE INDEX "ContentAngle_topicResearchId_status_idx" ON "ContentAngle"("topicResearchId", "status");
CREATE INDEX "ContentAngle_generationId_idx" ON "ContentAngle"("generationId");
CREATE INDEX "ContentAngleSource_researchSourceId_idx" ON "ContentAngleSource"("researchSourceId");
