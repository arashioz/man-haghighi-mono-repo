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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_categories_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "articles" 
ADD COLUMN "metaTitle" TEXT,
ADD COLUMN "metaDescription" TEXT,
ADD COLUMN "metaKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "canonicalUrl" TEXT,
ADD COLUMN "focusKeyword" TEXT,
ADD COLUMN "ogTitle" TEXT,
ADD COLUMN "ogDescription" TEXT,
ADD COLUMN "ogImage" TEXT,
ADD COLUMN "ogType" TEXT NOT NULL DEFAULT 'article',
ADD COLUMN "twitterCard" TEXT NOT NULL DEFAULT 'summary_large_image',
ADD COLUMN "twitterTitle" TEXT,
ADD COLUMN "twitterDescription" TEXT,
ADD COLUMN "twitterImage" TEXT,
ADD COLUMN "schemaType" TEXT NOT NULL DEFAULT 'Article',
ADD COLUMN "author" TEXT,
ADD COLUMN "authorBio" TEXT,
ADD COLUMN "allowComments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "readingTime" INTEGER,
ADD COLUMN "categoryId" TEXT,
ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "relatedArticles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "scheduledAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "article_categories_name_key" ON "article_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "article_categories_slug_key" ON "article_categories"("slug");

-- CreateIndex
CREATE INDEX "article_categories_slug_idx" ON "article_categories"("slug");

-- CreateIndex
CREATE INDEX "articles_slug_idx" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_categoryId_idx" ON "articles"("categoryId");

-- CreateIndex
CREATE INDEX "articles_published_idx" ON "articles"("published");

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "article_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "article_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

