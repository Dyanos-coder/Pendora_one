-- CreateTable
CREATE TABLE `appointment` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NULL,
    `patientName` VARCHAR(191) NULL,
    `patientAge` INTEGER NULL,
    `doctorId` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL,
    `durationMin` INTEGER NOT NULL DEFAULT 30,
    `service` VARCHAR(191) NULL,
    `room` VARCHAR(191) NULL,
    `type` ENUM('CONSULTATION', 'SUIVI', 'EXAMEN', 'RESULTAT', 'CHIRURGIE', 'CAMPAGNE', 'AUTRE') NOT NULL DEFAULT 'CONSULTATION',
    `motive` VARCHAR(191) NULL,
    `status` ENUM('CONFIRME', 'EN_ATTENTE', 'ANNULE', 'TERMINE') NOT NULL DEFAULT 'CONFIRME',
    `reminder` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `appointment` ADD CONSTRAINT `appointment_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment` ADD CONSTRAINT `appointment_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
