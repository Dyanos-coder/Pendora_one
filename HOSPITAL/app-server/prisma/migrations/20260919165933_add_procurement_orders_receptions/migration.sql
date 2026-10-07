-- CreateTable
CREATE TABLE `purchase_order` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NULL,
    `supplierId` VARCHAR(191) NULL,
    `article` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DOUBLE NULL,
    `orderedAt` DATETIME(3) NOT NULL,
    `expectedDeliveryAt` DATETIME(3) NULL,
    `status` ENUM('EN_PREPARATION', 'ENVOYEE', 'CONFIRMEE', 'LIVREE', 'ANNULEE') NOT NULL DEFAULT 'EN_PREPARATION',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `purchase_order_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goods_reception` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL,
    `receivedQty` INTEGER NOT NULL,
    `condition` ENUM('CONFORME', 'PARTIELLE', 'ENDOMMAGEE') NOT NULL DEFAULT 'CONFORME',
    `receivedBy` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `purchase_order` ADD CONSTRAINT `purchase_order_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `procurement_request`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order` ADD CONSTRAINT `purchase_order_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_reception` ADD CONSTRAINT `goods_reception_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `purchase_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
