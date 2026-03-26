-- DropForeignKey
ALTER TABLE "ProjectComponent" DROP CONSTRAINT "ProjectComponent_catalogId_fkey";

-- AlterTable
ALTER TABLE "ProjectComponent" ALTER COLUMN "catalogId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ProjectComponent" ADD CONSTRAINT "ProjectComponent_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "ComponentCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
