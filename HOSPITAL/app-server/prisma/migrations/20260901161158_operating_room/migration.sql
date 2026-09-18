-- CreateTable
CREATE TABLE `operating_room` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('AVAILABLE', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',

    UNIQUE INDEX `operating_room_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `surgery` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NULL,
    `patientName` VARCHAR(191) NULL,
    `patientCode` VARCHAR(191) NULL,
    `patientAge` INTEGER NULL,
    `patientGender` ENUM('M', 'F') NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `procedure` VARCHAR(191) NOT NULL,
    `procedureDetail` VARCHAR(191) NULL,
    `specialty` VARCHAR(191) NULL,
    `surgeonId` VARCHAR(191) NULL,
    `anesthetistId` VARCHAR(191) NULL,
    `roomId` VARCHAR(191) NULL,
    `status` ENUM('TERMINEE', 'EN_COURS', 'EN_ATTENTE', 'ANNULEE') NOT NULL DEFAULT 'EN_ATTENTE',
    `expectedDurationMin` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `surgery` ADD CONSTRAINT `surgery_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `surgery` ADD CONSTRAINT `surgery_surgeonId_fkey` FOREIGN KEY (`surgeonId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `surgery` ADD CONSTRAINT `surgery_anesthetistId_fkey` FOREIGN KEY (`anesthetistId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `surgery` ADD CONSTRAINT `surgery_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `operating_room`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
