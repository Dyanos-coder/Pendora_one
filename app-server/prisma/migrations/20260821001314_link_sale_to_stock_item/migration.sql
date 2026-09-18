-- AlterTable (la table `sale` est vide à ce stade, donc l'ajout de colonnes NOT NULL est sûr)
ALTER TABLE `sale` ADD COLUMN `stockItemId` VARCHAR(191) NOT NULL, ADD COLUMN `quantity` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `sale_stockItemId_idx` ON `sale`(`stockItemId`);

-- AddForeignKey
ALTER TABLE `sale` ADD CONSTRAINT `sale_stockItemId_fkey` FOREIGN KEY (`stockItemId`) REFERENCES `stock_item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
