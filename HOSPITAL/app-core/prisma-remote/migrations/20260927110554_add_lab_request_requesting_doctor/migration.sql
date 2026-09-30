-- AlterTable
ALTER TABLE `lab_request` ADD COLUMN `requestingDoctorId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `picklist_value` (
    `id` VARCHAR(191) NOT NULL,
    `listKey` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `picklist_value_listKey_value_key`(`listKey`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lab_request` ADD CONSTRAINT `lab_request_requestingDoctorId_fkey` FOREIGN KEY (`requestingDoctorId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
