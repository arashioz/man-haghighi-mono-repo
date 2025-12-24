-- Add gateway columns to settings table if they don't exist
DO $$
BEGIN
    -- Add gatewayTerminalId
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'settings' AND column_name = 'gatewayTerminalId'
    ) THEN
        ALTER TABLE "settings" ADD COLUMN "gatewayTerminalId" TEXT;
    END IF;

    -- Add gatewayUsername
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'settings' AND column_name = 'gatewayUsername'
    ) THEN
        ALTER TABLE "settings" ADD COLUMN "gatewayUsername" TEXT;
    END IF;

    -- Add gatewayPassword
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'settings' AND column_name = 'gatewayPassword'
    ) THEN
        ALTER TABLE "settings" ADD COLUMN "gatewayPassword" TEXT;
    END IF;

    -- Add gatewayMode
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'settings' AND column_name = 'gatewayMode'
    ) THEN
        ALTER TABLE "settings" ADD COLUMN "gatewayMode" TEXT DEFAULT 'test';
    END IF;

    -- Add gatewayCallbackUrl
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'settings' AND column_name = 'gatewayCallbackUrl'
    ) THEN
        ALTER TABLE "settings" ADD COLUMN "gatewayCallbackUrl" TEXT;
    END IF;

    -- Add gatewayAutoVerify
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'settings' AND column_name = 'gatewayAutoVerify'
    ) THEN
        ALTER TABLE "settings" ADD COLUMN "gatewayAutoVerify" BOOLEAN DEFAULT true;
    END IF;

    -- Add gatewayAutoSettle
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'settings' AND column_name = 'gatewayAutoSettle'
    ) THEN
        ALTER TABLE "settings" ADD COLUMN "gatewayAutoSettle" BOOLEAN DEFAULT true;
    END IF;
END $$;

