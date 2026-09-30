-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dossier" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "service" TEXT,
    "motive" TEXT,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "patientId" TEXT,
    "patientName" TEXT,
    "patientCode" TEXT,
    "patientAge" INTEGER,
    "patientGender" TEXT,
    "doctorId" TEXT,
    "doctorName" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "service" TEXT,
    "room" TEXT,
    "type" TEXT NOT NULL DEFAULT 'CONSULTATION',
    "motive" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRME',
    "reminder" TEXT,
    "patientId" TEXT,
    "patientName" TEXT,
    "patientAge" INTEGER,
    "doctorId" TEXT,
    "doctorName" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "EmergencyVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "arrivalTime" DATETIME NOT NULL,
    "dischargeTime" DATETIME,
    "motive" TEXT,
    "detail" TEXT,
    "severity" TEXT NOT NULL,
    "zone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE_TRIAGE',
    "outcome" TEXT,
    "patientId" TEXT,
    "patientName" TEXT,
    "patientCode" TEXT,
    "patientAge" INTEGER,
    "patientGender" TEXT,
    "doctorId" TEXT,
    "doctorName" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_dossier_key" ON "Consultation"("dossier");
