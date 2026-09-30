-- CreateTable
CREATE TABLE `consultation` (
    `id` VARCHAR(191) NOT NULL,
    `dossier` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NULL,
    `patientName` VARCHAR(191) NULL,
    `patientCode` VARCHAR(191) NULL,
    `patientAge` INTEGER NULL,
    `patientGender` ENUM('M', 'F') NULL,
    `doctorId` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL,
    `service` VARCHAR(191) NULL,
    `motive` VARCHAR(191) NULL,
    `status` ENUM('TERMINEE', 'EN_COURS', 'EN_ATTENTE', 'ANNULEE') NOT NULL DEFAULT 'EN_ATTENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `consultation_dossier_key`(`dossier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `consultation` ADD CONSTRAINT `consultation_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consultation` ADD CONSTRAINT `consultation_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
