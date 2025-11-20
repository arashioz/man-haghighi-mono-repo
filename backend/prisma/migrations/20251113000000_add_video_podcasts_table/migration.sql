-- CreateTable
CREATE TABLE IF NOT EXISTS "video_podcasts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoFile" TEXT NOT NULL,
    "thumbnail" TEXT,
    "duration" INTEGER,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_podcasts_pkey" PRIMARY KEY ("id")
);

