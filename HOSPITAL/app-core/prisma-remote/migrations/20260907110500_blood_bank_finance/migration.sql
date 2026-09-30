
-- CreateTable
CREATE TABLE `blood_pouch` (
    `id` VARCHAR(191) NOT NULL,
    `pouchNumber` VARCHAR(191) NOT NULL,
    `bloodGroup` VARCHAR(191) NOT NULL,
    `component` VARCHAR(191) NOT NULL,
    `volumeMl` INTEGER NULL,
    `status` ENUM('DISPONIBLE', 'EN_ATTENTE_ANALYSE', 'RESERVEE', 'TRANSFUSEE', 'PERIMEE') NOT NULL DEFAULT 'DISPONIBLE',
    `collectionDate` DATETIME(3) NOT NULL,
    `expiryDate` DATETIME(3) NOT NULL,
    `donorName` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `blood_pouch_pouchNumber_key`(`pouchNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_transaction` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `type` ENUM('RECETTE', 'DEPENSE') NOT NULL,
    `party` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `status` ENUM('PAYE', 'EN_ATTENTE', 'EN_RETARD') NOT NULL DEFAULT 'PAYE',
    `paymentMode` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `finance_transaction_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `blood_pouch` ADD CONSTRAINT `blood_pouch_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

