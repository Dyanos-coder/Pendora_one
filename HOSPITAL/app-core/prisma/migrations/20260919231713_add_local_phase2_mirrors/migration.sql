-- CreateTable
CREATE TABLE "Hospitalization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT,
    "patientName" TEXT,
    "patientCode" TEXT,
    "bedId" TEXT,
    "bedRoom" TEXT,
    "bedLabel" TEXT,
    "doctorId" TEXT,
    "doctorName" TEXT,
    "admissionDate" DATETIME NOT NULL,
    "dischargeDate" DATETIME,
    "service" TEXT,
    "motive" TEXT,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Surgery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT,
    "patientName" TEXT,
    "patientCode" TEXT,
    "patientAge" INTEGER,
    "patientGender" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "procedure" TEXT NOT NULL,
    "procedureDetail" TEXT,
    "specialty" TEXT,
    "surgeonId" TEXT,
    "surgeonName" TEXT,
    "anesthetistId" TEXT,
    "anesthetistName" TEXT,
    "roomId" TEXT,
    "roomName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "expectedDurationMin" INTEGER,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "LabRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestNumber" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT,
    "patientCode" TEXT,
    "patientAge" INTEGER,
    "patientGender" TEXT,
    "requestedAt" DATETIME NOT NULL,
    "resultAt" DATETIME,
    "service" TEXT,
    "analysisType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE_PRELEVEMENT',
    "priority" TEXT NOT NULL DEFAULT 'NORMALE',
    "sample" TEXT,
    "technicianId" TEXT,
    "technicianName" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ImagingRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT,
    "patientName" TEXT,
    "patientCode" TEXT,
    "patientAge" INTEGER,
    "patientGender" TEXT,
    "requestedAt" DATETIME NOT NULL,
    "resultAt" DATETIME,
    "examType" TEXT NOT NULL,
    "region" TEXT,
    "service" TEXT,
    "doctorId" TEXT,
    "doctorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE_LECTURE',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "expectedDurationMin" INTEGER,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "CardioExam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT,
    "patientName" TEXT,
    "patientCode" TEXT,
    "patientAge" INTEGER,
    "patientGender" TEXT,
    "requestedAt" DATETIME NOT NULL,
    "resultAt" DATETIME,
    "examType" TEXT NOT NULL,
    "indication" TEXT,
    "doctorId" TEXT,
    "doctorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "priority" TEXT NOT NULL DEFAULT 'NORMALE',
    "expectedDurationMin" INTEGER,
    "room" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "PathologyRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT,
    "patientName" TEXT,
    "patientCode" TEXT,
    "patientAge" INTEGER,
    "patientGender" TEXT,
    "requestedAt" DATETIME NOT NULL,
    "resultAt" DATETIME,
    "sampleType" TEXT NOT NULL,
    "location" TEXT,
    "service" TEXT,
    "doctorId" TEXT,
    "doctorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE_PRELEVEMENT',
    "priority" TEXT NOT NULL DEFAULT 'NORMALE',
    "expectedDurationMin" INTEGER,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "EndoscopyProcedure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT,
    "patientName" TEXT,
    "patientCode" TEXT,
    "patientAge" INTEGER,
    "patientGender" TEXT,
    "requestedAt" DATETIME NOT NULL,
    "resultAt" DATETIME,
    "procedureType" TEXT NOT NULL,
    "indication" TEXT,
    "service" TEXT,
    "endoscopistId" TEXT,
    "endoscopistName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "priority" TEXT NOT NULL DEFAULT 'NORMALE',
    "expectedDurationMin" INTEGER,
    "room" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "available" INTEGER NOT NULL,
    "minThreshold" INTEGER NOT NULL,
    "nearestExpiry" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "BloodPouch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pouchNumber" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "volumeMl" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE_ANALYSE',
    "collectionDate" DATETIME NOT NULL,
    "expiryDate" DATETIME NOT NULL,
    "donorName" TEXT NOT NULL,
    "patientId" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "LabRequest_requestNumber_key" ON "LabRequest"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BloodPouch_pouchNumber_key" ON "BloodPouch"("pouchNumber");
