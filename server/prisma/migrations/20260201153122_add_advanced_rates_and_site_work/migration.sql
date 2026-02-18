/*
  Warnings:

  - You are about to drop the column `engineeringRatePerIO` on the `CostSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CostSettings" DROP COLUMN "engineeringRatePerIO",
ADD COLUMN     "engRateAnalog" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "engRateDigital" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "engRateHLI" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "documentation" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "lodging" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "mandays" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "mobilization" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "training" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "System" ADD COLUMN     "documentation" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "lodging" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "mandays" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "mobilization" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "training" DECIMAL(65,30) NOT NULL DEFAULT 0;
