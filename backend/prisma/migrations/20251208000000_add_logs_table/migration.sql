-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT,
    "method" TEXT,
    "url" TEXT,
    "statusCode" INTEGER,
    "duration" INTEGER,
    "userId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "errorStack" TEXT,
    "requestBody" JSONB,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logs_level_idx" ON "logs"("level");

-- CreateIndex
CREATE INDEX "logs_context_idx" ON "logs"("context");

-- CreateIndex
CREATE INDEX "logs_createdAt_idx" ON "logs"("createdAt");

-- CreateIndex
CREATE INDEX "logs_url_idx" ON "logs"("url");

-- CreateIndex
CREATE INDEX "logs_statusCode_idx" ON "logs"("statusCode");



