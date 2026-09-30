-- CreateTable
CREATE TABLE `pathology_request` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NULL,
    `patientName` VARCHAR(191) NULL,
    `patientCode` VARCHAR(191) NULL,
    `patientAge` INTEGER NULL,
    `patientGender` ENUM('M', 'F') NULL,
    `requestedAt` DATETIME(3) NOT NULL,
    `resultAt` DATETIME(3) NULL,
    `sampleType` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `service` VARCHAR(191) NULL,
    `doctorId` VARCHAR(191) NULL,
    `status` ENUM('RESULTAT_VALIDE', 'EN_COURS', 'EN_ATTENTE_PRELEVEMENT', 'ANNULEE') NOT NULL DEFAULT 'EN_ATTENTE_PRELEVEMENT',
    `priority` ENUM('NORMALE', 'URGENT') NOT NULL DEFAULT 'NORMALE',
    `expectedDurationMin` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `endoscopy_procedure` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NULL,
    `patientName` VARCHAR(191) NULL,
    `patientCode` VARCHAR(191) NULL,
    `patientAge` INTEGER NULL,
    `patientGender` ENUM('M', 'F') NULL,
    `requestedAt` DATETIME(3) NOT NULL,
    `resultAt` DATETIME(3) NULL,
    `procedureType` VARCHAR(191) NOT NULL,
    `indication` VARCHAR(191) NULL,
    `service` VARCHAR(191) NULL,
    `endoscopistId` VARCHAR(191) NULL,
    `status` ENUM('REALISE', 'EN_COURS', 'EN_ATTENTE', 'PROGRAMME', 'ANNULE') NOT NULL DEFAULT 'EN_ATTENTE',
    `priority` ENUM('NORMALE', 'URGENT') NOT NULL DEFAULT 'NORMALE',
    `expectedDurationMin` INTEGER NULL,
    `room` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pathology_request` ADD CONSTRAINT `pathology_request_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pathology_request` ADD CONSTRAINT `pathology_request_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `endoscopy_procedure` ADD CONSTRAINT `endoscopy_procedure_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `endoscopy_procedure` ADD CONSTRAINT `endoscopy_procedure_endoscopistId_fkey` FOREIGN KEY (`endoscopistId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
