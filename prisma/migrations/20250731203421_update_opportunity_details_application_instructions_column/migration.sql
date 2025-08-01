/*
  Warnings:

  - The `applicationInstructions` column on the `opportunity_details` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "opportunity_details" DROP COLUMN "applicationInstructions",
ADD COLUMN     "applicationInstructions" TEXT[];
