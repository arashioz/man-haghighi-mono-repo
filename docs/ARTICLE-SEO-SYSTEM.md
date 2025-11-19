# 📝 سیستم مقاله حرفه‌ای با قابلیت‌های SEO کامل

یک سیستم حرفه‌ای مقاله‌نویسی و مدیریت محتوا با تمام قابلیت‌های SEO و بهینه‌سازی برای موتورهای جستجو.

## ✨ قابلیت‌های اصلی

### 🎯 ویژگی‌های SEO
- ✅ **Meta Tags کامل**: Title, Description, Keywords
- ✅ **Open Graph**: برای شبکه‌های اجتماعی (Facebook, LinkedIn)
- ✅ **Twitter Cards**: برای توییتر
- ✅ **Schema.org**: JSON-LD برای موتورهای جستجو
- ✅ **Canonical URL**: جلوگیری از محتوای تکراری
- ✅ **Focus Keyword**: کلمه کلیدی اصلی
- ✅ **تحلیل خودکار SEO**: امتیازدهی و پیشنهادات بهبود
- ✅ **پیش‌نمایش Google**: نمایش دقیق نتایج جستجو
- ✅ **محاسبه خودکار زمان مطالعه**
- ✅ **شمارش بازدید**
- ✅ **Slug بهینه**: تولید خودکار URL های SEO-friendly

### 📝 ویرایشگر حرفه‌ای
- ✅ **Rich Text Editor**: با React Quill
- ✅ **پشتیبانی از RTL**: برای فارسی
- ✅ **فرمت‌بندی کامل**: سرفصل، لیست، نقل قول، کد، و...
- ✅ **تصاویر و ویدیو**: درج مستقیم در محتوا
- ✅ **لینک‌ها**: داخلی و خارجی
- ✅ **کدهای HTML**: برای کاربران پیشرفته

### 🏷️ مدیریت محتوا
- ✅ **دسته‌بندی‌ها**: سلسله مراتبی (والد-فرزند)
- ✅ **تگ‌ها**: برچسب‌گذاری چندگانه
- ✅ **مقالات مرتبط**: خودکار بر اساس دسته و تگ
- ✅ **پیش‌نویس و انتشار**: کنترل وضعیت
- ✅ **زمان‌بندی انتشار**: انتشار خودکار
- ✅ **نویسنده و بیوگرافی**: اطلاعات نویسنده

### 🔍 جستجو و فیلترینگ
- ✅ **جستجوی متنی**: در عنوان و محتوا
- ✅ **فیلتر بر اساس دسته**
- ✅ **فیلتر بر اساس تگ**
- ✅ **فیلتر وضعیت انتشار**
- ✅ **صفحه‌بندی**: برای عملکرد بهتر

## 🏗️ معماری سیستم

### Backend (NestJS)

#### 1. مدل‌های دیتابیس
```prisma
model Article {
  // اطلاعات اصلی
  id, title, slug, content, excerpt, featuredImage
  
  // SEO Fields
  metaTitle, metaDescription, metaKeywords, canonicalUrl, focusKeyword
  
  // Open Graph
  ogTitle, ogDescription, ogImage, ogType
  
  // Twitter Card
  twitterCard, twitterTitle, twitterDescription, twitterImage
  
  // Schema.org
  schemaType, author, authorBio
  
  // تنظیمات
  allowComments, viewCount, readingTime
  categoryId, tags, relatedArticles
  published, publishedAt, scheduledAt
}

model ArticleCategory {
  id, name, slug, description
  seoTitle, seoDescription
  parentId (سلسله مراتبی)
  order, isActive
}
```

#### 2. سرویس‌ها
- **ArticlesService**: مدیریت CRUD مقالات
- **SeoService**: تحلیل و بهینه‌سازی SEO
  - `calculateReadingTime()`: محاسبه زمان مطالعه
  - `generateExcerpt()`: تولید خلاصه
  - `optimizeSlug()`: بهینه‌سازی URL
  - `analyzeSeoQuality()`: تحلیل کیفیت SEO
  - `generateArticleSchema()`: تولید Schema.org
  - `generateOpenGraphTags()`: تولید OG tags
  - `generateTwitterCardTags()`: تولید Twitter Card
- **UrlService**: مدیریت URL ها و فایل‌ها

#### 3. Endpoints
```
POST   /api/articles                      - ایجاد مقاله
GET    /api/articles                      - لیست مقالات (با فیلتر)
GET    /api/articles/published            - مقالات منتشر شده
GET    /api/articles/:id                  - دریافت مقاله
GET    /api/articles/slug/:slug           - دریافت با slug
PATCH  /api/articles/:id                  - ویرایش مقاله
PATCH  /api/articles/:id/featured-image   - آپلود تصویر
DELETE /api/articles/:id                  - حذف مقاله
GET    /api/articles/:id/seo-analysis     - تحلیل SEO
GET    /api/articles/:id/schema           - دریافت Schema.org
GET    /api/articles/:id/related          - مقالات مرتبط

POST   /api/articles/categories           - ایجاد دسته‌بندی
GET    /api/articles/categories/all       - لیست دسته‌ها
PATCH  /api/articles/categories/:id       - ویرایش دسته
DELETE /api/articles/categories/:id       - حذف دسته
```

### Frontend (React/Admin Panel)

#### 1. کامپوننت‌ها
- **RichTextEditor**: ویرایشگر متن غنی با React Quill
- **SeoPreview**: پیش‌نمایش نتایج Google
- **Articles**: صفحه اصلی مدیریت مقالات

#### 2. فیچرها
- تب‌های جداگانه: ویرایشگر، SEO، پیشرفته
- تولید خودکار slug از عنوان
- مدیریت کلمات کلیدی و تگ‌ها
- پیش‌نمایش زنده SEO
- نمایش امتیاز SEO

## 🚀 راهنمای نصب و راه‌اندازی

### 1. نصب پکیج‌های لازم

```bash
# در دایرکتوری admin-panel
cd /Users/arash/Desktop/new-haghighi/admin-panel
npm install react-quill @types/react-quill
npm install --save-dev @types/quill
```

### 2. اجرای Migration

```bash
# در دایرکتوری backend
cd /Users/arash/Desktop/new-haghighi

# در کانتینر Docker
docker exec -it new-haghighi-backend-1 npx prisma migrate deploy
docker exec -it new-haghighi-backend-1 npx prisma generate

# یا اگر local اجرا می‌کنید
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 3. بیلد و راه‌اندازی مجدد

```bash
cd /Users/arash/Desktop/new-haghighi

# راه‌اندازی با docker-compose
docker-compose down
docker-compose build
docker-compose up -d

# یا با پورت‌های جایگزین
docker-compose -f docker-compose-alt-ports.yml down
docker-compose -f docker-compose-alt-ports.yml build
docker-compose -f docker-compose-alt-ports.yml up -d
```

### 4. افزودن CSS برای React Quill

در فایل `admin-panel/src/index.css` یا `admin-panel/src/App.css`:
```css
/* React Quill Styles */
@import 'react-quill/dist/quill.snow.css';
```

## 📖 راهنمای استفاده

### نوشتن مقاله حرفه‌ای

1. **عنوان**: 
   - 30-60 کاراکتر
   - شامل کلمه کلیدی اصلی

2. **Slug**:
   - خودکار تولید می‌شود
   - قابل ویرایش دستی
   - فقط حروف، اعداد و خط تیره

3. **محتوا**:
   - استفاده از سرفصل‌ها (H1-H6)
   - پاراگراف‌های کوتاه
   - لیست‌ها برای خوانایی بهتر
   - تصاویر با alt text مناسب

4. **SEO**:
   - **Meta Title**: 50-60 کاراکتر
   - **Meta Description**: 120-160 کاراکتر
   - **Focus Keyword**: کلمه کلیدی اصلی
   - **Keywords**: 5-10 کلمه کلیدی مرتبط

5. **تگ‌ها**:
   - 3-7 تگ برای هر مقاله
   - مرتبط با محتوا

### نکات مهم SEO

✅ **کلمه کلیدی اصلی باید در**:
- عنوان مقاله
- 100 کلمه اول محتوا
- حداقل یک سرفصل
- Meta Description
- URL (Slug)

✅ **محتوای باکیفیت**:
- حداقل 300 کلمه
- بهتر است 1000+ کلمه
- اصیل و منحصر به فرد
- ارزش‌آفرین برای خواننده

✅ **لینک‌دهی**:
- لینک داخلی به مقالات مرتبط
- لینک خارجی به منابع معتبر
- تمام لینک‌ها با anchor text مناسب

## 🎨 تنظیمات اضافی

### سفارشی‌سازی ویرایشگر

در `RichTextEditor.tsx` می‌توانید toolbar را سفارشی کنید:
```typescript
const modules = {
  toolbar: [
    // ابزارهای مورد نیاز خود را اضافه کنید
  ]
};
```

### تنظیمات SEO پیشرفته

در `backend/src/common/services/seo.service.ts` می‌توانید:
- الگوریتم امتیازدهی SEO را تغییر دهید
- قوانین جدید اضافه کنید
- تنظیمات Schema.org را سفارشی کنید

## 📊 مثال استفاده از API

```typescript
// ایجاد مقاله
const article = await articlesService.create({
  title: 'راهنمای جامع سئو',
  slug: 'راهنمای-جامع-سئو',
  content: '<p>محتوای مقاله...</p>',
  metaDescription: 'آموزش کامل سئو از صفر تا صد',
  focusKeyword: 'سئو',
  metaKeywords: ['سئو', 'بهینه سازی', 'گوگل'],
  tags: ['سئو', 'دیجیتال مارکتینگ'],
  published: true,
});

// تحلیل SEO
const seoAnalysis = await articlesService.analyzeSeo(articleId);
// نتیجه: { score: 85, issues: [], suggestions: [] }

// دریافت مقالات مرتبط
const related = await articlesService.getRelated(articleId, 5);
```

## 🔧 عیب‌یابی

### مشکل: ویرایشگر نمایش داده نمی‌شود
**راه‌حل**: مطمئن شوید react-quill نصب شده و CSS آن import شده است.

### مشکل: خطای Prisma Client
**راه‌حل**: `npx prisma generate` را اجرا کنید.

### مشکل: فایل‌ها آپلود نمی‌شوند
**راه‌حل**: مطمئن شوید دایرکتوری `uploads` وجود دارد و قابل نوشتن است.

## 🎉 نتیجه

شما الان یک سیستم مقاله حرفه‌ای دارید که:
- ✅ SEO-friendly است
- ✅ برای کاربر راحت است
- ✅ برای موتورهای جستجو بهینه است
- ✅ قابل‌های پیشرفته دارد
- ✅ آماده تولید محتوای حرفه‌ای است

**موفق باشید! 🚀**

