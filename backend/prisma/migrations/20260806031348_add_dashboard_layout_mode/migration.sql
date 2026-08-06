-- CreateEnum
CREATE TYPE "DashboardLayoutMode" AS ENUM ('SCROLL', 'FIT');

-- AlterTable
ALTER TABLE "Dashboard" ADD COLUMN     "layoutMode" "DashboardLayoutMode" NOT NULL DEFAULT 'SCROLL';
