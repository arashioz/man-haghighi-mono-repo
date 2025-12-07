-- AlterTable
ALTER TABLE "users" 
  ALTER COLUMN "password" DROP NOT NULL,
  ADD COLUMN "otp" TEXT,
  ADD COLUMN "otpExpiresAt" TIMESTAMP(3);

