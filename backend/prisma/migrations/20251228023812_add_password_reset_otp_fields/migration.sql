-- AlterTable
ALTER TABLE "users" ADD COLUMN     "resetOtp" TEXT,
ADD COLUMN     "resetOtpExpiresAt" TIMESTAMP(3);
