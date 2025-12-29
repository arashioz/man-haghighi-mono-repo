-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "siteName" TEXT DEFAULT 'سایت',
    "siteDescription" TEXT,
    "siteEmail" TEXT,
    "sitePhone" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsProvider" TEXT,
    "smsApiKey" TEXT,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailProvider" TEXT,
    "emailApiKey" TEXT,
    "backupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "backupFrequency" TEXT DEFAULT 'daily',
    "maxUploadSize" INTEGER DEFAULT 104857600,
    "allowedFileTypes" TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg']::TEXT[],
    "gatewayTerminalId" TEXT,
    "gatewayUsername" TEXT,
    "gatewayPassword" TEXT,
    "gatewayMode" TEXT DEFAULT 'test',
    "gatewayCallbackUrl" TEXT,
    "gatewayAutoVerify" BOOLEAN NOT NULL DEFAULT true,
    "gatewayAutoSettle" BOOLEAN NOT NULL DEFAULT true,
    "messageTemplateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "messageTemplateText" TEXT DEFAULT 'سلام {name}\nمبلغ: {amount} تومان\nلینک پرداخت:\n{link}',
    "whatsappTemplateText" TEXT DEFAULT 'سلام {name}!\nلینک پرداخت شما آماده است:\n{link}\nمبلغ: {amount} تومان',

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settings_id_key" ON "settings"("id");

-- Insert default settings row
INSERT INTO "settings" ("id") VALUES ('settings');
