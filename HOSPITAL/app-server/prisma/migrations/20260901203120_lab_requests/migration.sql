-- CreateTable
CREATE TABLE `lab_request` (
    `id` VARCHAR(191) NOT NULL,
    `requestNumber` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NULL,
    `patientName` VARCHAR(191) NULL,
    `patientCode` VARCHAR(191) NULL,
    `patientAge` INTEGER NULL,
    `patientGender` ENUM('M', 'F') NULL,
    `requestedAt` DATETIME(3) NOT NULL,
    `resultAt` DATETIME(3) NULL,
    `service` VARCHAR(191) NULL,
    `analysisType` VARCHAR(191) NOT NULL,
    `status` ENUM('RESULTAT_VALIDE', 'EN_COURS', 'EN_ATTENTE_PRELEVEMENT', 'ANNULEE') NOT NULL DEFAULT 'EN_ATTENTE_PRELEVEMENT',
    `priority` ENUM('NORMALE', 'ELEVEE', 'CRITIQUE') NOT NULL DEFAULT 'NORMALE',
    `sample` VARCHAR(191) NULL,
    `technicianId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lab_request_requestNumber_key`(`requestNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lab_request` ADD CONSTRAINT `lab_request_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_request` ADD CONSTRAINT `lab_request_technicianId_fkey` FOREIGN KEY (`technicianId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
