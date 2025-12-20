# 🔍 راهنمای حفظ SEO بعد از انتقال دامنه

این راهنما برای اطمینان از حفظ رتبه‌بندی و SEO بعد از انتقال دامنه به `manehaghighi.com` است.

## ✅ کارهای انجام شده

### 1. **Sitemap.xml**
- ✅ Endpoint داینامیک: `/api/seo/sitemap.xml`
- ✅ شامل تمام صفحات منتشر شده:
  - صفحه اصلی
  - مقالات
  - دوره‌ها
  - پادکست‌ها
  - ویدیو پادکست‌ها
- ✅ به‌روزرسانی خودکار بر اساس آخرین تغییرات

### 2. **Robots.txt**
- ✅ بهینه شده برای SEO
- ✅ اشاره به sitemap
- ✅ محافظت از صفحات admin و API

### 3. **Meta Tags**
- ✅ Canonical URLs
- ✅ Open Graph (Facebook, LinkedIn)
- ✅ Twitter Cards
- ✅ Meta Description و Keywords

### 4. **Canonical URLs**
- ✅ هر صفحه canonical URL دارد
- ✅ جلوگیری از محتوای تکراری

## 📋 مراحل ضروری بعد از انتقال دامنه

### 1. **تنظیم Redirects (301 Permanent Redirect)**

اگر دامنه قدیمی دارید، باید تمام URL‌ها را به دامنه جدید redirect کنید:

```nginx
# در nginx.conf یا سرور
server {
    listen 80;
    server_name old-domain.com www.old-domain.com;
    
    # Redirect همه درخواست‌ها به دامنه جدید
    return 301 https://manehaghighi.com$request_uri;
}
```

### 2. **ارسال Sitemap به Google Search Console**

1. وارد [Google Search Console](https://search.google.com/search-console) شوید
2. دامنه `manehaghighi.com` را اضافه کنید
3. Sitemap را ثبت کنید: `https://manehaghighi.com/sitemap.xml`

### 3. **ارسال Sitemap به Bing Webmaster Tools**

1. وارد [Bing Webmaster Tools](https://www.bing.com/webmasters) شوید
2. دامنه را اضافه کنید
3. Sitemap را ثبت کنید

### 4. **بررسی Index شدن صفحات**

بعد از چند روز، بررسی کنید:
- آیا صفحات جدید index شده‌اند؟
- آیا صفحات قدیمی redirect می‌شوند؟

## 🔧 تنظیمات توصیه شده

### Google Analytics & Search Console

1. دامنه جدید را در Google Analytics اضافه کنید
2. دامنه جدید را در Search Console اضافه کنید
3. Sitemap را submit کنید

### تنظیمات Backend

در `.env` فایل:
```env
FRONTEND_URL=https://manehaghighi.com
API_ORIGIN=https://manehaghighi.com/api
```

## 📊 نظارت بر SEO

بعد از انتقال:

1. **بررسی رتبه‌بندی**: آیا کلمات کلیدی رتبه خود را حفظ کرده‌اند؟
2. **بررسی ترافیک**: آیا ترافیک کاهش یافته است؟
3. **بررسی Index شدن**: آیا صفحات جدید index شده‌اند؟

## ⚠️ نکات مهم

1. **همیشه از 301 Redirect استفاده کنید** (نه 302)
2. **Canonical URLs را همیشه تنظیم کنید**
3. **Sitemap را به‌صورت منظم به‌روزرسانی کنید**
4. **محتوای تکراری ایجاد نکنید**

## 🔗 لینک‌های مفید

- Sitemap: https://manehaghighi.com/sitemap.xml
- Robots.txt: https://manehaghighi.com/robots.txt
- Google Search Console: https://search.google.com/search-console
- Bing Webmaster Tools: https://www.bing.com/webmasters




