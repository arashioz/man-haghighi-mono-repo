-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SALES_MANAGER', 'SALES_PERSON', 'USER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "user_phone" TEXT,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "otp" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOld" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "education" TEXT,
    "university" TEXT,
    "job" TEXT,
    "state" TEXT,
    "gender" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sliders" (
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

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "featuredImage" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT[],
    "canonicalUrl" TEXT,
    "focusKeyword" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "ogType" TEXT NOT NULL DEFAULT 'article',
    "twitterCard" TEXT NOT NULL DEFAULT 'summary_large_image',
    "twitterTitle" TEXT,
    "twitterDescription" TEXT,
    "twitterImage" TEXT,
    "schemaType" TEXT NOT NULL DEFAULT 'Article',
    "author" TEXT,
    "authorBio" TEXT,
    "allowComments" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "readingTime" INTEGER,
    "categoryId" TEXT,
    "tags" TEXT[],
    "relatedArticles" TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "podcasts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "audioFile" TEXT NOT NULL,
    "thumbnail" TEXT,
    "duration" INTEGER,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "podcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_podcasts" (
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

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(15,2) NOT NULL,
    "thumbnail" TEXT,
    "videoFile" TEXT,
    "attachments" TEXT[],
    "courseVideos" TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "showOnHomepage" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoFile" TEXT NOT NULL,
    "thumbnail" TEXT,
    "duration" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "courseId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audios" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "audioFile" TEXT NOT NULL,
    "thumbnail" TEXT,
    "duration" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "course_id" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,

    CONSTRAINT "video_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "audioId" TEXT NOT NULL,

    CONSTRAINT "audio_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshops" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TEXT NOT NULL,
    "location" TEXT,
    "maxParticipants" INTEGER,
    "price" DECIMAL(15,2) NOT NULL,
    "thumbnail" TEXT,
    "videoLinks" TEXT[],
    "audioLinks" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_participants" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "prepaymentAmount" DECIMAL(10,2) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentLink" TEXT,
    "invitationCard" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_person_workshop_access" (
    "id" TEXT NOT NULL,
    "salesPersonId" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "grantedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_person_workshop_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "salesPersonId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "old_products" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productCategory" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "old_products_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_user_phone_key" ON "users"("user_phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_slug_idx" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_categoryId_idx" ON "articles"("categoryId");

-- CreateIndex
CREATE INDEX "articles_published_idx" ON "articles"("published");

-- CreateIndex
CREATE UNIQUE INDEX "article_categories_name_key" ON "article_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "article_categories_slug_key" ON "article_categories"("slug");

-- CreateIndex
CREATE INDEX "article_categories_slug_idx" ON "article_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_userId_courseId_key" ON "course_enrollments"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "video_access_userId_videoId_key" ON "video_access"("userId", "videoId");

-- CreateIndex
CREATE UNIQUE INDEX "audio_access_userId_audioId_key" ON "audio_access"("userId", "audioId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_person_workshop_access_salesPersonId_workshopId_key" ON "sales_person_workshop_access"("salesPersonId", "workshopId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_team_members_teamId_salesPersonId_key" ON "sales_team_members"("teamId", "salesPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "old_products_userId_productId_key" ON "old_products"("userId", "productId");

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

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "article_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "article_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audios" ADD CONSTRAINT "audios_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_access" ADD CONSTRAINT "video_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_access" ADD CONSTRAINT "video_access_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_access" ADD CONSTRAINT "audio_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_access" ADD CONSTRAINT "audio_access_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "audios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_participants" ADD CONSTRAINT "workshop_participants_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_participants" ADD CONSTRAINT "workshop_participants_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_person_workshop_access" ADD CONSTRAINT "sales_person_workshop_access_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_person_workshop_access" ADD CONSTRAINT "sales_person_workshop_access_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_person_workshop_access" ADD CONSTRAINT "sales_person_workshop_access_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_teams" ADD CONSTRAINT "sales_teams_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_team_members" ADD CONSTRAINT "sales_team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "sales_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_team_members" ADD CONSTRAINT "sales_team_members_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "old_products" ADD CONSTRAINT "old_products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

