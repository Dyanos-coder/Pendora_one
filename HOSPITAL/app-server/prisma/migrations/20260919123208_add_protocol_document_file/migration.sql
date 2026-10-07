-- AlterTable
ALTER TABLE `protocol_document` ADD COLUMN `content` LONGBLOB NULL,
    ADD COLUMN `fileName` VARCHAR(191) NULL,
    ADD COLUMN `fileSize` INTEGER NULL,
    ADD COLUMN `mimeType` VARCHAR(191) NULL;
