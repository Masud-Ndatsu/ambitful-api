-- AlterTable
ALTER TABLE "ai_drafts" ADD COLUMN     "dateScraped" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "extractedAmount" TEXT,
ADD COLUMN     "extractedApplicationInstructions" TEXT[],
ADD COLUMN     "extractedBenefits" TEXT[],
ADD COLUMN     "extractedCategory" TEXT,
ADD COLUMN     "extractedDeadline" TIMESTAMP(3),
ADD COLUMN     "extractedDescription" TEXT,
ADD COLUMN     "extractedEligibility" TEXT[],
ADD COLUMN     "extractedFullDescription" TEXT,
ADD COLUMN     "extractedLink" TEXT,
ADD COLUMN     "extractedLocation" TEXT,
ADD COLUMN     "extractedTitle" TEXT,
ADD COLUMN     "extractedType" "opportunity_type",
ADD COLUMN     "opportunityId" TEXT,
ADD COLUMN     "rawContent" TEXT,
ADD COLUMN     "reviewedBy" TEXT,
ALTER COLUMN "extractedData" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ai_drafts_status_idx" ON "ai_drafts"("status");

-- CreateIndex
CREATE INDEX "ai_drafts_priority_idx" ON "ai_drafts"("priority");

-- CreateIndex
CREATE INDEX "ai_drafts_extractedType_idx" ON "ai_drafts"("extractedType");

-- CreateIndex
CREATE INDEX "ai_drafts_extractedDeadline_idx" ON "ai_drafts"("extractedDeadline");

-- CreateIndex
CREATE INDEX "ai_drafts_dateScraped_idx" ON "ai_drafts"("dateScraped");

-- AddForeignKey
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
