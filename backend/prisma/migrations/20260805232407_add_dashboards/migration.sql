-- CreateEnum
CREATE TYPE "DashboardVisibility" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "DashboardCustomerScope" AS ENUM ('ALL', 'SPECIFIC');

-- CreateTable
CREATE TABLE "Dashboard" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visibility" "DashboardVisibility" NOT NULL DEFAULT 'SHARED',
    "customerScope" "DashboardCustomerScope" NOT NULL DEFAULT 'SPECIFIC',

    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardCustomerAccess" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "DashboardCustomerAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardWidget" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "layout" JSONB NOT NULL,

    CONSTRAINT "DashboardWidget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardCustomerAccess_customerId_idx" ON "DashboardCustomerAccess"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardCustomerAccess_dashboardId_customerId_key" ON "DashboardCustomerAccess"("dashboardId", "customerId");

-- CreateIndex
CREATE INDEX "DashboardWidget_dashboardId_idx" ON "DashboardWidget"("dashboardId");

-- AddForeignKey
ALTER TABLE "DashboardCustomerAccess" ADD CONSTRAINT "DashboardCustomerAccess_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
