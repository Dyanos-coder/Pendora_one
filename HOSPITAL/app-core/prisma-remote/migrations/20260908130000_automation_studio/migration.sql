
-- CreateTable
CREATE TABLE `automation_rule` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `trigger` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `category` ENUM('RENDEZ_VOUS', 'STOCKS', 'LABORATOIRE', 'FINANCES', 'RH', 'SOINS_PATIENTS') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_log` (
    `id` VARCHAR(191) NOT NULL,
    `ruleId` VARCHAR(191) NOT NULL,
    `runAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `success` BOOLEAN NOT NULL,
    `detail` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `automation_log` ADD CONSTRAINT `automation_log_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `automation_rule`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

