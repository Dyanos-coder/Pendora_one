-- AlterTable
ALTER TABLE `company` ADD COLUMN `logo` LONGBLOB NULL,
    ADD COLUMN `logoMimeType` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `invoice` ADD COLUMN `photo` LONGBLOB NULL,
    ADD COLUMN `photoMimeType` VARCHAR(191) NULL;
