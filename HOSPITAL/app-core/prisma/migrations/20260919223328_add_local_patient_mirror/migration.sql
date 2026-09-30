-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "bloodType" TEXT,
    "allergies" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "admissionType" TEXT NOT NULL DEFAULT 'AMBULATOIRE',
    "service" TEXT,
    "insuranceProvider" TEXT,
    "insuranceNumber" TEXT,
    "insuranceExpiry" DATETIME,
    "balance" REAL NOT NULL DEFAULT 0,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_code_key" ON "Patient"("code");
