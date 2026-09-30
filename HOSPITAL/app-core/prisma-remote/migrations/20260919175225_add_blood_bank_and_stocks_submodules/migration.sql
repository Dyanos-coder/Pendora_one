-- AlterTable
ALTER TABLE `blood_pouch` MODIFY `status` ENUM('DISPONIBLE', 'EN_ATTENTE_ANALYSE', 'RESERVEE', 'TRANSFUSEE', 'PERIMEE', 'ECARTEE') NOT NULL DEFAULT 'DISPONIBLE';

-- CreateTable
CREATE TABLE `stock_movement` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `type` ENUM('ENTREE', 'SORTIE') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `movementDate` DATETIME(3) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `performedBy` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `stock_movement_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_transfer` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `fromItemId` VARCHAR(191) NOT NULL,
    `toDepotId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `transferDate` DATETIME(3) NOT NULL,
    `performedBy` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `stock_transfer_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_count` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `expectedQuantity` INTEGER NOT NULL,
    `countedQuantity` INTEGER NOT NULL,
    `conductedBy` VARCHAR(191) NOT NULL,
    `conductedAt` DATETIME(3) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `inventory_count_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_loss` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `type` ENUM('PERTE', 'RETOUR') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `reportedBy` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `stock_loss_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blood_donation` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `donorName` VARCHAR(191) NOT NULL,
    `donorPhone` VARCHAR(191) NULL,
    `bloodGroup` VARCHAR(191) NOT NULL,
    `donationDate` DATETIME(3) NOT NULL,
    `volumeMl` INTEGER NULL,
    `status` ENUM('PLANIFIE', 'COLLECTE', 'AJOURNE') NOT NULL DEFAULT 'PLANIFIE',
    `pouchId` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `blood_donation_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfusion_request` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `bloodGroup` VARCHAR(191) NOT NULL,
    `component` VARCHAR(191) NOT NULL,
    `quantityUnits` INTEGER NOT NULL,
    `urgency` ENUM('NORMALE', 'URGENTE') NOT NULL DEFAULT 'NORMALE',
    `status` ENUM('EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'HONOREE') NOT NULL DEFAULT 'EN_ATTENTE',
    `requestedBy` VARCHAR(191) NOT NULL,
    `requestedAt` DATETIME(3) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `transfusion_request_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfusion` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `pouchId` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NULL,
    `transfusedAt` DATETIME(3) NOT NULL,
    `administeredBy` VARCHAR(191) NOT NULL,
    `reaction` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `transfusion_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blood_analysis` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `pouchId` VARCHAR(191) NOT NULL,
    `testType` VARCHAR(191) NOT NULL,
    `result` ENUM('EN_ATTENTE', 'NEGATIF', 'POSITIF') NOT NULL DEFAULT 'EN_ATTENTE',
    `performedBy` VARCHAR(191) NOT NULL,
    `performedAt` DATETIME(3) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `blood_analysis_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stock_movement` ADD CONSTRAINT `stock_movement_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `depot_item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfer` ADD CONSTRAINT `stock_transfer_fromItemId_fkey` FOREIGN KEY (`fromItemId`) REFERENCES `depot_item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfer` ADD CONSTRAINT `stock_transfer_toDepotId_fkey` FOREIGN KEY (`toDepotId`) REFERENCES `depot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_count` ADD CONSTRAINT `inventory_count_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `depot_item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_loss` ADD CONSTRAINT `stock_loss_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `depot_item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blood_donation` ADD CONSTRAINT `blood_donation_pouchId_fkey` FOREIGN KEY (`pouchId`) REFERENCES `blood_pouch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfusion_request` ADD CONSTRAINT `transfusion_request_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfusion` ADD CONSTRAINT `transfusion_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfusion` ADD CONSTRAINT `transfusion_pouchId_fkey` FOREIGN KEY (`pouchId`) REFERENCES `blood_pouch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfusion` ADD CONSTRAINT `transfusion_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `transfusion_request`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blood_analysis` ADD CONSTRAINT `blood_analysis_pouchId_fkey` FOREIGN KEY (`pouchId`) REFERENCES `blood_pouch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
