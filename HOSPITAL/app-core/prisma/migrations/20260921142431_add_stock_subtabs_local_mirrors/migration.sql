-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "movementDate" DATETIME NOT NULL,
    "reason" TEXT,
    "performedBy" TEXT NOT NULL,
    "note" TEXT,
    "serverUpdatedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "fromItemId" TEXT NOT NULL,
    "fromItemName" TEXT,
    "toDepotId" TEXT NOT NULL,
    "toDepotName" TEXT,
    "quantity" INTEGER NOT NULL,
    "transferDate" DATETIME NOT NULL,
    "performedBy" TEXT NOT NULL,
    "note" TEXT,
    "serverUpdatedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "InventoryCount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT,
    "expectedQuantity" INTEGER NOT NULL,
    "countedQuantity" INTEGER NOT NULL,
    "conductedBy" TEXT NOT NULL,
    "conductedAt" DATETIME NOT NULL,
    "note" TEXT,
    "serverUpdatedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "StockLoss" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "note" TEXT,
    "serverUpdatedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_reference_key" ON "StockMovement"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_reference_key" ON "StockTransfer"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCount_reference_key" ON "InventoryCount"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "StockLoss_reference_key" ON "StockLoss"("reference");
