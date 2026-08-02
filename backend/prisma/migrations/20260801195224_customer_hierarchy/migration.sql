-- CreateTable
CREATE TABLE "CustomerHierarchyLevels" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "levelIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CustomerHierarchyLevels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerHierarchyLevels_customerId_levelIndex_key" ON "CustomerHierarchyLevels"("customerId", "levelIndex");
