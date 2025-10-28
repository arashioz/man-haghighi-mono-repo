-- AlterTable
ALTER TABLE "workshops" ADD COLUMN "videoLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "audioLinks" TEXT[] DEFAULT ARRAY[]::TEXT[];

