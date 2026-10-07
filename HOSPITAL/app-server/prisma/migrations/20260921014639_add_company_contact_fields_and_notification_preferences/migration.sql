-- AlterTable
ALTER TABLE `company` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `contactEmail` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `timezone` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `notification_preference` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `email` BOOLEAN NOT NULL DEFAULT true,
    `sms` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
