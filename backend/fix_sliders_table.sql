-- Fix sliders table migration
-- This script ensures the sliders table exists with proper structure

-- Create sliders table if it doesn't exist
CREATE TABLE IF NOT EXISTS "sliders" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT NOT NULL,
    "videoFile" TEXT,
    "link" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sliders_pkey" PRIMARY KEY ("id")
);

-- Create articles table if it doesn't exist
CREATE TABLE IF NOT EXISTS "articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "featuredImage" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- Create podcasts table if it doesn't exist
CREATE TABLE IF NOT EXISTS "podcasts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "audioFile" TEXT NOT NULL,
    "duration" INTEGER,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "podcasts_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS "articles_slug_key" ON "articles"("slug");

-- Insert some sample sliders if the table is empty
INSERT INTO "sliders" ("id", "title", "description", "image", "videoFile", "link", "order", "isActive", "createdAt", "updatedAt")
SELECT 
    'slider_1',
    'خوش آمدید به پلتفرم حقیقی',
    'پلتفرم آموزشی حقیقی برای رشد و توسعه فردی',
    '/uploads/slider1.jpg',
    NULL,
    '/courses',
    1,
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM "sliders" WHERE "id" = 'slider_1');

INSERT INTO "sliders" ("id", "title", "description", "image", "videoFile", "link", "order", "isActive", "createdAt", "updatedAt")
SELECT 
    'slider_2',
    'دوره‌های آموزشی تخصصی',
    'دسترسی به بهترین دوره‌های آموزشی در زمینه رشد فردی',
    '/uploads/slider2.jpg',
    NULL,
    '/courses',
    2,
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM "sliders" WHERE "id" = 'slider_2');
