-- CreateTable
CREATE TABLE "HardwarePackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwarePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwarePackageItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "HardwarePackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HardwarePackage_name_key" ON "HardwarePackage"("name");

-- AddForeignKey
ALTER TABLE "HardwarePackageItem" ADD CONSTRAINT "HardwarePackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "HardwarePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwarePackageItem" ADD CONSTRAINT "HardwarePackageItem_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "ComponentCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
