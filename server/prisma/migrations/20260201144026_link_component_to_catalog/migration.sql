-- AddForeignKey
ALTER TABLE "ProjectComponent" ADD CONSTRAINT "ProjectComponent_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "ComponentCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
