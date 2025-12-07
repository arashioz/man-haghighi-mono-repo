-- AlterTable
-- Check if column exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'courses' 
        AND column_name = 'showOnHomepage'
    ) THEN
        ALTER TABLE "courses" ADD COLUMN "showOnHomepage" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

