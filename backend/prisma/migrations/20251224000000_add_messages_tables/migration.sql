-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageStatus') THEN
    CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sendSms" BOOLEAN NOT NULL DEFAULT false,
    "sendInApp" BOOLEAN NOT NULL DEFAULT true,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "inAppSentCount" INTEGER NOT NULL DEFAULT 0,
    "smsSentCount" INTEGER NOT NULL DEFAULT 0,
    "smsFailedCount" INTEGER NOT NULL DEFAULT 0,
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "smsStatus" TEXT,
    "smsError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "messages_status_idx" ON "messages"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_messages_createdAt_idx" ON "user_messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_messages_userId_messageId_key" ON "user_messages"("userId", "messageId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_sentById_fkey'
  ) THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_messages_userId_fkey'
  ) THEN
    ALTER TABLE "user_messages" ADD CONSTRAINT "user_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_messages_messageId_fkey'
  ) THEN
    ALTER TABLE "user_messages" ADD CONSTRAINT "user_messages_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;











