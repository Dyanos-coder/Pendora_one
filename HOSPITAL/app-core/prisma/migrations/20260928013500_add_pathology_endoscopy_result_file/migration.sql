ALTER TABLE "PathologyRequest" ADD COLUMN "resultFileName" TEXT;
ALTER TABLE "PathologyRequest" ADD COLUMN "resultMimeType" TEXT;
ALTER TABLE "PathologyRequest" ADD COLUMN "resultFileSize" INTEGER;
ALTER TABLE "EndoscopyProcedure" ADD COLUMN "resultFileName" TEXT;
ALTER TABLE "EndoscopyProcedure" ADD COLUMN "resultMimeType" TEXT;
ALTER TABLE "EndoscopyProcedure" ADD COLUMN "resultFileSize" INTEGER;
