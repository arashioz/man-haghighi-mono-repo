-- Add parentId column to comments table for reply functionality
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'comments_parentId_fkey'
    ) THEN
        ALTER TABLE "comments" 
        ADD CONSTRAINT "comments_parentId_fkey" 
        FOREIGN KEY ("parentId") 
        REFERENCES "comments"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Add index for parentId
CREATE INDEX IF NOT EXISTS "comments_parentId_idx" ON "comments"("parentId");



