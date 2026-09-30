-- AlterTable
ALTER TABLE `blood_donation` ADD COLUMN `patientId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `blood_donation` ADD CONSTRAINT `blood_donation_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
