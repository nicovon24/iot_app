ALTER TABLE "CustomerHierarchyLevels" ADD COLUMN "instanceUrl" TEXT;
ALTER TABLE "AssetHierarchyAssignment" ADD COLUMN "instanceUrl" TEXT;
ALTER TABLE "ImpersonationLog" ADD COLUMN "instanceUrl" TEXT;
ALTER TABLE "Dashboard" ADD COLUMN "instanceUrl" TEXT;

DROP INDEX "CustomerHierarchyLevels_customerId_levelIndex_key";
DROP INDEX "AssetHierarchyAssignment_assetId_key";

CREATE UNIQUE INDEX "CustomerHierarchyLevels_instanceUrl_customerId_levelIndex_key"
  ON "CustomerHierarchyLevels"("instanceUrl", "customerId", "levelIndex");
CREATE INDEX "CustomerHierarchyLevels_customerId_levelIndex_idx"
  ON "CustomerHierarchyLevels"("customerId", "levelIndex");
CREATE UNIQUE INDEX "AssetHierarchyAssignment_instanceUrl_assetId_key"
  ON "AssetHierarchyAssignment"("instanceUrl", "assetId");
CREATE INDEX "AssetHierarchyAssignment_assetId_idx" ON "AssetHierarchyAssignment"("assetId");
CREATE INDEX "Dashboard_instanceUrl_idx" ON "Dashboard"("instanceUrl");
