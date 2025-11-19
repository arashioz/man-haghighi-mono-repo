-- Rename phone column to user_phone to match legacy import structure
ALTER TABLE "users"
  RENAME COLUMN "phone" TO "user_phone";



