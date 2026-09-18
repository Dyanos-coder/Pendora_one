-- CreateTable
CREATE TABLE `emergency_visit` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NULL,
    `patientName` VARCHAR(191) NULL,
    `patientCode` VARCHAR(191) NULL,
    `patientAge` INTEGER NULL,
    `patientGender` ENUM('M', 'F') NULL,
    `arrivalTime` DATETIME(3) NOT NULL,
    `dischargeTime` DATETIME(3) NULL,
    `motive` VARCHAR(191) NULL,
    `detail` VARCHAR(191) NULL,
    `severity` ENUM('CRITIQUE', 'ELEVE', 'MOYEN', 'FAIBLE') NOT NULL,
    `zone` VARCHAR(191) NULL,
    `doctorId` VARCHAR(191) NULL,
    `status` ENUM('EN_COURS', 'EN_OBSERVATION', 'EN_ATTENTE_TRIAGE', 'SORTI', 'TRANSFERE', 'ANNULE') NOT NULL DEFAULT 'EN_ATTENTE_TRIAGE',
    `outcome` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `emergency_visit` ADD CONSTRAINT `emergency_visit_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emergency_visit` ADD CONSTRAINT `emergency_visit_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
