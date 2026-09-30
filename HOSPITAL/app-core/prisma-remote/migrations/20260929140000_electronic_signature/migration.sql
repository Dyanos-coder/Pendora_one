-- AlterTable
ALTER TABLE `user` ADD COLUMN `signatureImage` LONGBLOB NULL,
    ADD COLUMN `signatureMimeType` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `signature_request` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `requestedById` VARCHAR(191) NOT NULL,
    `message` TEXT NULL,
    `status` ENUM('EN_ATTENTE', 'SIGNE', 'REFUSE') NOT NULL DEFAULT 'EN_ATTENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidedById` VARCHAR(191) NULL,
    `decidedAt` DATETIME(3) NULL,
    `refusalReason` TEXT NULL,
    `originalContent` LONGBLOB NULL,

    INDEX `signature_request_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `signature_request` ADD CONSTRAINT `signature_request_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `protocol_document`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `signature_request` ADD CONSTRAINT `signature_request_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `signature_request` ADD CONSTRAINT `signature_request_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Aucun SMS n'est réellement envoyé par l'application : la règle d'automatisation « Rappel de
-- rendez-vous SMS » (données de démonstration) est retirée avec son journal.
DELETE FROM `automation_log` WHERE `ruleId` IN (SELECT `id` FROM `automation_rule` WHERE `name` = 'Rappel de rendez-vous SMS');
DELETE FROM `automation_rule` WHERE `name` = 'Rappel de rendez-vous SMS';
