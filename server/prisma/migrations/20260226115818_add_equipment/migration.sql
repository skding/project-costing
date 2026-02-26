-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sectionId" TEXT NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentIO" (
    "id" TEXT NOT NULL,
    "ioType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "equipmentId" TEXT NOT NULL,

    CONSTRAINT "EquipmentIO_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentIO" ADD CONSTRAINT "EquipmentIO_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
