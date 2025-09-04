-- AlterTable
ALTER TABLE "users" ADD COLUMN     "linkedinAccessToken" TEXT,
ADD COLUMN     "linkedinTokenExpiresAt" TIMESTAMP(3);
