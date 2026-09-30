
-- AlterTable
ALTER TABLE `employee` ADD COLUMN `absentDays` INTEGER NULL,
    ADD COLUMN `averageHoursMin` INTEGER NULL,
    ADD COLUMN `contractEndDate` DATETIME(3) NULL,
    ADD COLUMN `contractNumber` VARCHAR(191) NULL,
    ADD COLUMN `contractType` ENUM('CDI', 'CDD') NULL,
    ADD COLUMN `dailyStatus` ENUM('PRESENT', 'ABSENT', 'CONGE', 'RETARD') NULL,
    ADD COLUMN `hireDate` DATETIME(3) NULL,
    ADD COLUMN `lateDays` INTEGER NULL,
    ADD COLUMN `matricule` VARCHAR(191) NULL,
    ADD COLUMN `overtimeHoursMin` INTEGER NULL,
    ADD COLUMN `presentDays` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `employee_matricule_key` ON `employee`(`matricule`);

