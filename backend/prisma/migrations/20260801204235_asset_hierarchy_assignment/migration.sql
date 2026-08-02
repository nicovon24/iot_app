-- CreateTable
CREATE TABLE "AssetHierarchyAssignment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "levelIndex" INTEGER NOT NULL,

    CONSTRAINT "AssetHierarchyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetHierarchyAssignment_assetId_key" ON "AssetHierarchyAssignment"("assetId");

-- CreateIndex
CREATE INDEX "AssetHierarchyAssignment_customerId_idx" ON "AssetHierarchyAssignment"("customerId");
