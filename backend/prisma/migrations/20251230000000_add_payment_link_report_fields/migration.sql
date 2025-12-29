-- AlterTable
ALTER TABLE "payment_links" ADD COLUMN     "cardNumber" TEXT,
ADD COLUMN     "gatewayName" TEXT,
ADD COLUMN     "requestTime" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT;
