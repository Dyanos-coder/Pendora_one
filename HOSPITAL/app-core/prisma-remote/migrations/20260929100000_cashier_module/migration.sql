-- AlterTable
ALTER TABLE `company` ADD COLUMN `receiptFooter` TEXT NULL,
    ADD COLUMN `registrationNumber` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('DIRIGEANT', 'MEDECIN', 'INFIRMIER', 'TECHNICIEN', 'PHARMACIEN', 'ADMINISTRATIF', 'CAISSIER') NOT NULL;

-- AlterTable
ALTER TABLE `employee` MODIFY `role` ENUM('DIRIGEANT', 'MEDECIN', 'INFIRMIER', 'TECHNICIEN', 'PHARMACIEN', 'ADMINISTRATIF', 'CAISSIER') NOT NULL;

-- AlterTable
ALTER TABLE `finance_transaction` MODIFY `status` ENUM('PAYE', 'EN_ATTENTE', 'EN_RETARD', 'ANNULE') NOT NULL DEFAULT 'PAYE';

-- AlterTable
ALTER TABLE `supplier_invoice` MODIFY `status` ENUM('PAYE', 'EN_ATTENTE', 'EN_RETARD', 'ANNULE') NOT NULL DEFAULT 'EN_ATTENTE';

-- CreateTable
CREATE TABLE `cash_register` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `receiptFormat` ENUM('TICKET_80MM', 'A6') NOT NULL DEFAULT 'TICKET_80MM',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash_register_cashier` (
    `registerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`registerId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash_session` (
    `id` VARCHAR(191) NOT NULL,
    `registerId` VARCHAR(191) NOT NULL,
    `cashierId` VARCHAR(191) NOT NULL,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `openingFloat` INTEGER NOT NULL DEFAULT 0,
    `closedAt` DATETIME(3) NULL,
    `expectedAmounts` JSON NULL,
    `countedAmounts` JSON NULL,
    `difference` INTEGER NULL,
    `closingNote` TEXT NULL,

    INDEX `cash_session_registerId_closedAt_idx`(`registerId`, `closedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tariff_item` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `service` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `color` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipt` (
    `id` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `registerId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `cashierId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NULL,
    `patientName` VARCHAR(191) NOT NULL,
    `patientCode` VARCHAR(191) NULL,
    `service` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `paymentMode` ENUM('ESPECES', 'MOBILE_MONEY', 'CARTE', 'PRISE_EN_CHARGE') NOT NULL,
    `paymentReference` VARCHAR(191) NULL,
    `queueNumber` INTEGER NULL,
    `status` ENUM('PAYE', 'ANNULE', 'REMBOURSE') NOT NULL DEFAULT 'PAYE',
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cancelledAt` DATETIME(3) NULL,
    `cancelledById` VARCHAR(191) NULL,
    `cancelReason` TEXT NULL,
    `refundedAt` DATETIME(3) NULL,
    `refundedById` VARCHAR(191) NULL,
    `refundReason` TEXT NULL,
    `financeTransactionId` VARCHAR(191) NULL,
    `refundTransactionId` VARCHAR(191) NULL,

    UNIQUE INDEX `receipt_number_key`(`number`),
    UNIQUE INDEX `receipt_financeTransactionId_key`(`financeTransactionId`),
    UNIQUE INDEX `receipt_refundTransactionId_key`(`refundTransactionId`),
    INDEX `receipt_sessionId_idx`(`sessionId`),
    INDEX `receipt_issuedAt_idx`(`issuedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipt_line` (
    `id` VARCHAR(191) NOT NULL,
    `receiptId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `unitPrice` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `tariffItemId` VARCHAR(191) NULL,
    `examType` VARCHAR(191) NULL,
    `examId` VARCHAR(191) NULL,

    INDEX `receipt_line_examType_examId_idx`(`examType`, `examId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cash_register_cashier` ADD CONSTRAINT `cash_register_cashier_registerId_fkey` FOREIGN KEY (`registerId`) REFERENCES `cash_register`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_register_cashier` ADD CONSTRAINT `cash_register_cashier_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_session` ADD CONSTRAINT `cash_session_registerId_fkey` FOREIGN KEY (`registerId`) REFERENCES `cash_register`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_session` ADD CONSTRAINT `cash_session_cashierId_fkey` FOREIGN KEY (`cashierId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipt` ADD CONSTRAINT `receipt_registerId_fkey` FOREIGN KEY (`registerId`) REFERENCES `cash_register`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipt` ADD CONSTRAINT `receipt_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `cash_session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipt` ADD CONSTRAINT `receipt_cashierId_fkey` FOREIGN KEY (`cashierId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipt` ADD CONSTRAINT `receipt_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipt` ADD CONSTRAINT `receipt_financeTransactionId_fkey` FOREIGN KEY (`financeTransactionId`) REFERENCES `finance_transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipt` ADD CONSTRAINT `receipt_refundTransactionId_fkey` FOREIGN KEY (`refundTransactionId`) REFERENCES `finance_transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipt_line` ADD CONSTRAINT `receipt_line_receiptId_fkey` FOREIGN KEY (`receiptId`) REFERENCES `receipt`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- Établissements ayant déjà enregistré leur liste de modules : « Caisse » (cashier) n'y figure pas.
-- Activé automatiquement là où la Comptabilité (finance) l'est (Plan-Module-Caisse.md étape 1).
UPDATE `company` SET `enabledModules` = REPLACE(`enabledModules`, '"finance"', '"cashier","finance"')
WHERE `enabledModules` LIKE '%"finance"%' AND `enabledModules` NOT LIKE '%"cashier"%';
