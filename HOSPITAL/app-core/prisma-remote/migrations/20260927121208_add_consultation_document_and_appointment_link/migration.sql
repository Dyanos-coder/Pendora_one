ALTER TABLE `consultation` ADD COLUMN `documentFileName` VARCHAR(191) NULL;
ALTER TABLE `consultation` ADD COLUMN `documentMimeType` VARCHAR(191) NULL;
ALTER TABLE `consultation` ADD COLUMN `documentFileSize` INT NULL;
ALTER TABLE `consultation` ADD COLUMN `documentContent` LONGBLOB NULL;

ALTER TABLE `appointment` ADD COLUMN `consultationId` VARCHAR(191) NULL;
ALTER TABLE `appointment` ADD UNIQUE INDEX `appointment_consultationId_key` (`consultationId`);
ALTER TABLE `appointment` ADD CONSTRAINT `appointment_consultationId_fkey` FOREIGN KEY (`consultationId`) REFERENCES `consultation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
