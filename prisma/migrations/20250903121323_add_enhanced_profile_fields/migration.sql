-- AlterTable
ALTER TABLE "users" ADD COLUMN     "academicLevel" TEXT,
ADD COLUMN     "aiInteractionPrefs" JSONB,
ADD COLUMN     "careerStage" TEXT,
ADD COLUMN     "currentFocus" TEXT[],
ADD COLUMN     "fieldOfStudy" TEXT,
ADD COLUMN     "goals" TEXT[],
ADD COLUMN     "languages" TEXT[],
ADD COLUMN     "learningStyle" TEXT,
ADD COLUMN     "personalityTraits" TEXT[],
ADD COLUMN     "preferences" JSONB,
ADD COLUMN     "timeZone" TEXT,
ADD COLUMN     "workExperience" TEXT;
