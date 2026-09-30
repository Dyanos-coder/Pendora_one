-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "BloodPouch" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "CardioExam" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "DepotItem" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "EmergencyVisit" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "EndoscopyProcedure" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "FinanceTransaction" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "Hospitalization" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "ImagingRequest" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "LabRequest" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "Medication" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "PathologyRequest" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "ProcurementRequest" ADD COLUMN "serverUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "Surgery" ADD COLUMN "serverUpdatedAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SyncOutbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "conflict" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SyncOutbox" ("createdAt", "entityId", "entityType", "id", "lastError", "operation", "payload", "retryCount", "status", "updatedAt") SELECT "createdAt", "entityId", "entityType", "id", "lastError", "operation", "payload", "retryCount", "status", "updatedAt" FROM "SyncOutbox";
DROP TABLE "SyncOutbox";
ALTER TABLE "new_SyncOutbox" RENAME TO "SyncOutbox";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
