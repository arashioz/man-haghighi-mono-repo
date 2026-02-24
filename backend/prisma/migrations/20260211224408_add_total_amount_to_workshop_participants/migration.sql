/*
  Warnings:

  - You are about to drop the column `prepaymentAmount` on the `workshop_participants` table. All the data in the column will be lost.
  - Added the required column `totalAmount` to the `workshop_participants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'CREATED';
ALTER TYPE "PaymentStatus" ADD VALUE 'GATEWAY_REDIRECTED';
ALTER TYPE "PaymentStatus" ADD VALUE 'PAYMENT_TIMEOUT';

-- AlterTable
ALTER TABLE "payment_links" ADD COLUMN     "aggregateCount" INTEGER,
ADD COLUMN     "isAggregate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable (totalAmount با DEFAULT تا روی دیتابیس دارای داده هم اجرا شود)
ALTER TABLE "workshop_participants" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "workshop_participants" ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "workshop_participants" DROP COLUMN IF EXISTS "prepaymentAmount";

-- CreateTable
CREATE TABLE "workshop_payments" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'PAYMENT_LINK',
    "paymentLinkId" TEXT,
    "transactionId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_payments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "workshop_payments" ADD CONSTRAINT "workshop_payments_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "workshop_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_payments" ADD CONSTRAINT "workshop_payments_paymentLinkId_fkey" FOREIGN KEY ("paymentLinkId") REFERENCES "payment_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
