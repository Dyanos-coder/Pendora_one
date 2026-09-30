-- Widen `user.role` first (keep EMPLOYE alongside the new values) so existing rows stay valid.
ALTER TABLE `user` MODIFY `role` ENUM('DIRIGEANT', 'EMPLOYE', 'MEDECIN', 'INFIRMIER', 'TECHNICIEN', 'PHARMACIEN', 'ADMINISTRATIF') NOT NULL;

-- Migrate legacy generic EMPLOYE accounts to MEDECIN (closest match for existing demo data).
UPDATE `user` SET `role` = 'MEDECIN' WHERE `role` = 'EMPLOYE';

-- Now that no row uses EMPLOYE, narrow the enum to its final shape.
ALTER TABLE `user` MODIFY `role` ENUM('DIRIGEANT', 'MEDECIN', 'INFIRMIER', 'TECHNICIEN', 'PHARMACIEN', 'ADMINISTRATIF') NOT NULL;

-- CreateTable
CREATE TABLE `employee` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `role` ENUM('DIRIGEANT', 'MEDECIN', 'INFIRMIER', 'TECHNICIEN', 'PHARMACIEN', 'ADMINISTRATIF') NOT NULL,
    `specialty` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employee_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_counter` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `value` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `document_counter_type_year_key`(`type`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `patient` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `gender` ENUM('M', 'F') NOT NULL,
    `birthDate` DATETIME(3) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `bloodType` VARCHAR(191) NULL,
    `allergies` TEXT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `admissionType` ENUM('AMBULATOIRE', 'HOSPITALISE', 'URGENCE') NOT NULL DEFAULT 'AMBULATOIRE',
    `service` VARCHAR(191) NULL,
    `insuranceProvider` VARCHAR(191) NULL,
    `insuranceNumber` VARCHAR(191) NULL,
    `insuranceExpiry` DATETIME(3) NULL,
    `balance` DOUBLE NOT NULL DEFAULT 0,
    `emergencyContactName` VARCHAR(191) NULL,
    `emergencyContactPhone` VARCHAR(191) NULL,
    `medicalHistory` JSON NULL,
    `familyHistory` JSON NULL,
    `lifestyle` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `patient_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employee` ADD CONSTRAINT `employee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
