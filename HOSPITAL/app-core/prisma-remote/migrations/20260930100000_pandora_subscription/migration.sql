-- Abonnement Pandora : tables écrites par le site Pandora, qui peut les avoir déjà créées
-- (IF NOT EXISTS, même définition que pandora-web/src/lib/subscription.ts).

-- CreateTable
CREATE TABLE IF NOT EXISTS `subscription` (
    `id` VARCHAR(191) NOT NULL,
    `payload` TEXT NOT NULL,
    `signature` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `pandora_link` (
    `id` VARCHAR(191) NOT NULL,
    `hospitalId` VARCHAR(191) NOT NULL,
    `siteUrl` VARCHAR(500) NOT NULL,
    `secret` VARCHAR(255) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
