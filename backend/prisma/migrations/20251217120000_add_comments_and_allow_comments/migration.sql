-- Add allowComments to podcasts and courses
ALTER TABLE "podcasts" ADD COLUMN IF NOT EXISTS "allowComments" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "allowComments" BOOLEAN NOT NULL DEFAULT TRUE;

-- Comment target enum
DO $$ BEGIN
  CREATE TYPE "CommentTargetType" AS ENUM ('ARTICLE', 'PODCAST', 'COURSE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Comments table
CREATE TABLE IF NOT EXISTS "comments" (
  "id" TEXT NOT NULL,
  "targetType" "CommentTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "authorPhone" TEXT,
  "content" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT FALSE,
  "publishedAt" TIMESTAMP(3),
  "publishedById" TEXT,
  "editedContent" TEXT,
  "editedAt" TIMESTAMP(3),
  "editedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- Foreign keys (users)
DO $$ BEGIN
  ALTER TABLE "comments"
    ADD CONSTRAINT "comments_publishedById_fkey"
    FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "comments"
    ADD CONSTRAINT "comments_editedById_fkey"
    FOREIGN KEY ("editedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "comments_targetType_targetId_idx" ON "comments" ("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "comments_targetType_targetId_isPublished_idx" ON "comments" ("targetType", "targetId", "isPublished");
CREATE INDEX IF NOT EXISTS "comments_createdAt_idx" ON "comments" ("createdAt");
CREATE INDEX IF NOT EXISTS "comments_isPublished_idx" ON "comments" ("isPublished");


