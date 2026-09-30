-- CreateTable
CREATE TABLE `bed` (
    `id` VARCHAR(191) NOT NULL,
    `room` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `service` VARCHAR(191) NULL,
    `status` ENUM('AVAILABLE', 'CLEANING', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',

    UNIQUE INDEX `bed_room_label_key`(`room`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hospitalization` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NULL,
    `patientName` VARCHAR(191) NULL,
    `patientCode` VARCHAR(191) NULL,
    `bedId` VARCHAR(191) NULL,
    `doctorId` VARCHAR(191) NULL,
    `admissionDate` DATETIME(3) NOT NULL,
    `dischargeDate` DATETIME(3) NULL,
    `service` VARCHAR(191) NULL,
    `motive` VARCHAR(191) NULL,
    `status` ENUM('HOSPITALISE', 'EN_ATTENTE', 'SORTI') NOT NULL DEFAULT 'EN_ATTENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hospitalization` ADD CONSTRAINT `hospitalization_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hospitalization` ADD CONSTRAINT `hospitalization_bedId_fkey` FOREIGN KEY (`bedId`) REFERENCES `bed`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hospitalization` ADD CONSTRAINT `hospitalization_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
