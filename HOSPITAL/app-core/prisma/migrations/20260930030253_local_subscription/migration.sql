-- CreateTable
CREATE TABLE "local_subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payload" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "maxSeenAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
