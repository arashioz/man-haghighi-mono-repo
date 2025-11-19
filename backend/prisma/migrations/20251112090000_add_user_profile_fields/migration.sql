-- Add legacy profile enrichment columns to the users table
ALTER TABLE "users"
  ADD COLUMN "education" TEXT,
  ADD COLUMN "university" TEXT,
  ADD COLUMN "job" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "gender" TEXT;

