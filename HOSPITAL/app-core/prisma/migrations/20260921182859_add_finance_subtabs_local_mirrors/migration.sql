-- CreateTable
CREATE TABLE "SupplierInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "orderId" TEXT,
    "orderReference" TEXT,
    "amount" INTEGER NOT NULL,
    "issuedAt" DATETIME NOT NULL,
    "dueAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "note" TEXT,
    "serverUpdatedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "PaymentReceived" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "payer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "receivedAt" DATETIME NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "note" TEXT,
    "serverUpdatedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ServiceExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "spentAt" DATETIME NOT NULL,
    "note" TEXT,
    "serverUpdatedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "allocatedAmount" INTEGER NOT NULL,
    "note" TEXT,
    "serverUpdatedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "serverUpdatedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoice_reference_key" ON "SupplierInvoice"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceived_reference_key" ON "PaymentReceived"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceExpense_reference_key" ON "ServiceExpense"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_reference_key" ON "Budget"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_reference_key" ON "BankAccount"("reference");
