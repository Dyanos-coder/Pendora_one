-- AlterTable
ALTER TABLE `lab_request` ADD COLUMN `resultContent` LONGBLOB NULL,
    ADD COLUMN `resultFileName` VARCHAR(191) NULL,
    ADD COLUMN `resultFileSize` INTEGER NULL,
    ADD COLUMN `resultMimeType` VARCHAR(191) NULL;
