-- Ensure enums exist/are up to date
DO $$
BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'PaymentStatus' AND e.enumlabel = 'CANCELLED'
      ) THEN
        ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';
      END IF;
    END;
END$$;

DO $$
BEGIN
  CREATE TYPE "InvoiceType" AS ENUM ('COURSE_PURCHASE', 'WALLET_CHARGE', 'PAYMENT_LINK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('PAYMENT', 'WALLET_CHARGE', 'WALLET_DEDUCTION', 'REFUND');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- Wallets table
CREATE TABLE IF NOT EXISTS "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wallets_userId_key" UNIQUE ("userId"),
    CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Payment links table
CREATE TABLE IF NOT EXISTS "payment_links" (
    "id" TEXT NOT NULL,
    "linkCode" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_links_linkCode_key" UNIQUE ("linkCode"),
    CONSTRAINT "payment_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Invoices table
CREATE TABLE IF NOT EXISTS "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT,
    "type" "InvoiceType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "courseId" TEXT,
    "paymentLinkId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "description" TEXT,
    "transactionId" TEXT,
    "gatewayResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoices_invoiceNumber_key" UNIQUE ("invoiceNumber"),
    CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invoices_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invoices_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invoices_paymentLinkId_fkey" FOREIGN KEY ("paymentLinkId") REFERENCES "payment_links"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Transactions table
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT,
    "invoiceId" TEXT,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balanceBefore" DECIMAL(15,2),
    "balanceAfter" DECIMAL(15,2),
    "description" TEXT,
    "orderId" TEXT,
    "refId" TEXT,
    "saleOrderId" TEXT,
    "saleReferenceId" TEXT,
    "cardHolderPan" TEXT,
    "bpPayRequestRaw" TEXT,
    "bpPayRequestDate" TIMESTAMP(3),
    "callbackRaw" JSONB,
    "callbackDate" TIMESTAMP(3),
    "verifyRaw" TEXT,
    "verifyDate" TIMESTAMP(3),
    "settleRaw" TEXT,
    "settleDate" TIMESTAMP(3),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "walletCredited" BOOLEAN NOT NULL DEFAULT false,
    "walletCreditDate" TIMESTAMP(3),
    "walletDeducted" BOOLEAN NOT NULL DEFAULT false,
    "walletDeductDate" TIMESTAMP(3),
    "coursePurchased" BOOLEAN NOT NULL DEFAULT false,
    "coursePurchaseDate" TIMESTAMP(3),
    "paymentLinkId" TEXT,
    "createdBySalesPersonId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transactions_orderId_key" UNIQUE ("orderId"),
    CONSTRAINT "transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_paymentLinkId_fkey" FOREIGN KEY ("paymentLinkId") REFERENCES "payment_links"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_createdBySalesPersonId_fkey" FOREIGN KEY ("createdBySalesPersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "invoices_userId_idx" ON "invoices"("userId");
CREATE INDEX IF NOT EXISTS "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices"("status");
CREATE INDEX IF NOT EXISTS "invoices_type_idx" ON "invoices"("type");
CREATE INDEX IF NOT EXISTS "invoices_createdAt_idx" ON "invoices"("createdAt");

CREATE INDEX IF NOT EXISTS "payment_links_createdById_idx" ON "payment_links"("createdById");
CREATE INDEX IF NOT EXISTS "payment_links_status_idx" ON "payment_links"("status");
CREATE INDEX IF NOT EXISTS "payment_links_createdAt_idx" ON "payment_links"("createdAt");

CREATE INDEX IF NOT EXISTS "transactions_walletId_idx" ON "transactions"("walletId");
CREATE INDEX IF NOT EXISTS "transactions_invoiceId_idx" ON "transactions"("invoiceId");
CREATE INDEX IF NOT EXISTS "transactions_userId_idx" ON "transactions"("userId");
CREATE INDEX IF NOT EXISTS "transactions_orderId_idx" ON "transactions"("orderId");
CREATE INDEX IF NOT EXISTS "transactions_type_idx" ON "transactions"("type");
CREATE INDEX IF NOT EXISTS "transactions_status_idx" ON "transactions"("status");
CREATE INDEX IF NOT EXISTS "transactions_createdAt_idx" ON "transactions"("createdAt");

