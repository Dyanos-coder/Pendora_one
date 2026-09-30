-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "requestId" TEXT,
    "requestReference" TEXT,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "article" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL,
    "orderedAt" DATETIME NOT NULL,
    "expectedDeliveryAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'EN_PREPARATION',
    "serverUpdatedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "GoodsReception" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "orderReference" TEXT,
    "article" TEXT,
    "receivedAt" DATETIME NOT NULL,
    "receivedQty" INTEGER NOT NULL,
    "orderedQty" INTEGER,
    "condition" TEXT NOT NULL DEFAULT 'CONFORME',
    "receivedBy" TEXT NOT NULL,
    "note" TEXT,
    "serverUpdatedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_reference_key" ON "PurchaseOrder"("reference");
