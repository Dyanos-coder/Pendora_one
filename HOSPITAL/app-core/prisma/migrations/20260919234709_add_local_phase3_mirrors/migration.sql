-- CreateTable
CREATE TABLE "DepotItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    "depotName" TEXT,
    "available" INTEGER NOT NULL,
    "minThreshold" INTEGER NOT NULL,
    "lastMovementAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ProcurementRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL,
    "article" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMALE',
    "status" TEXT NOT NULL DEFAULT 'A_VALIDER',
    "requester" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "FinanceTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "party" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "paymentMode" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "specialty" TEXT,
    "department" TEXT,
    "matricule" TEXT,
    "contractType" TEXT,
    "contractNumber" TEXT,
    "hireDate" DATETIME,
    "contractEndDate" DATETIME,
    "dailyStatus" TEXT,
    "presentDays" INTEGER,
    "absentDays" INTEGER,
    "lateDays" INTEGER,
    "averageHoursMin" INTEGER,
    "overtimeHoursMin" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementRequest_reference_key" ON "ProcurementRequest"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceTransaction_reference_key" ON "FinanceTransaction"("reference");
