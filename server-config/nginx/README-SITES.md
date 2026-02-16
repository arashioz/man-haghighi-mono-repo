# راهنمای فایل‌های nginx و رفع CORS

## کدام فایل برای چیست؟

| فایل روی سرور | کاربرد |
|---------------|--------|
| **manehaghighi** | سایت اصلی (manehaghighi.com و www)، ریدایرکت HTTP→HTTPS برای همهٔ دامنه‌ها. **نباید** بلوک `api.manehaghighi.com` داخلش باشد. |
| **api.manehaghighi.com** | فقط API (دامنه api.manehaghighi.com) با **CORS کامل** تا هم ادمین هم سایت اصلی خطا نگیرند. |

اگر بلوک `server_name api.manehaghighi.com` داخل **manehaghighi** باشد و بدون CORS باشد، nginx ممکن است همان را برای api.manehaghighi.com استفاده کند و در نتیجه CORS نخواهید داشت. پس باید API فقط در فایل **api.manehaghighi.com** تعریف شود و با CORS.

---

## چرا الان CORS می‌گیرید؟

1. **بلوک api.manehaghighi.com داخل manehaghighi** هیچ هدر CORS ندارد؛ اگر این بلوک اول لود شود، برای api.manehaghighi.com استفاده می‌شود و مرورگر CORS خطا می‌دهد.
2. **map در nginx.conf include نشده**؛ بدون `include /etc/nginx/cors-api.map.conf` داخل `http {}`، متغیر `$cors_api_origin` خالی است و هدر CORS درست فرستاده نمی‌شود.

---

## کارهایی که باید روی سرور انجام دهید

### ۱. nginx.conf — اضافه کردن map (الزامی)

```bash
sudo nano /etc/nginx/nginx.conf
```

داخل بلوک `http { ... }` یک خط مثل این اضافه کنید (قبل از `include sites-enabled`):

```nginx
http {
    # ...
    include /etc/nginx/cors-api.map.conf;
    # ...
    include /etc/nginx/sites-enabled/*;
}
```

فایل map را هم کپی کنید:

```bash
sudo cp /path/to/project/server-config/nginx/cors-api.map.conf /etc/nginx/
```

### ۲. فایل manehaghighi — فقط سایت اصلی و ریدایرکت

- محتوای **manehaghighi** را با `manehaghighi.sites.conf` جایگزین کنید (یا دستی بلوک `server_name api.manehaghighi.com` را حذف کنید).
- یعنی در **manehaghighi** فقط بماند:
  - یک `server` برای ریدایرکت 80→443
  - یک `server` برای manehaghighi.com و www (فرانت 8081 و `/api/` به 8080).

### ۳. فایل api.manehaghighi.com — فقط API با CORS

- محتوای **api.manehaghighi.com** را با `api.manehaghighi.com.server.conf` عوض کنید (همان فایلی که در پروژه CORS و OPTIONS و map دارد).
- مطمئن شوید این فایل در `sites-enabled` لینک شده است:

```bash
sudo ln -sf /etc/nginx/sites-available/api.manehaghighi.com /etc/nginx/sites-enabled/
```

### ۴. تست و ریلود

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## تنظیمات خود اپ (بک‌اند و فرانت)

- **بک‌اند (NestJS):** در `.env` روی سرور مقدار `CORS_ORIGINS` را با همان دامنه‌هایی که از آن‌ها درخواست می‌زنید پر کنید، مثلاً:
  ```env
  CORS_ORIGINS=https://admin.manehaghighi.com,https://manehaghighi.com,https://www.manehaghighi.com,https://api.manehaghighi.com
  ```
  این برای وقتی است که پاسخ مستقیم از خود بک‌اند می‌آید؛ nginx با هدرهای CORS که گذاشتیم پوشش می‌دهد وقتی جواب از nginx (مثلاً 502) یا از پروکسی می‌آید.

- **فرانت (سایت اصلی manehaghighi.com):**
  - اگر درخواست‌ها به **همان دامنه** می‌روند (مثلاً `https://manehaghighi.com/api/`) → همان کانفیگ فعلی nginx برای `location /api/` کافی است و CORS لازم نیست (same-origin).
  - اگر فرانت به **api.manehaghighi.com** درخواست می‌زند (مثلاً با `REACT_APP_API_URL=https://api.manehaghighi.com`) → در آن حالت CORS لازم است و با کانفیگ فایل **api.manehaghighi.com** و map درست می‌شود.

- **پنل ادمین (admin.manehaghighi.com):** همیشه به api.manehaghighi.com درخواست می‌زند؛ پس CORS حتماً روی api.manehaghighi.com (همان فایل با map) لازم است.

---

## جمع‌بندی

- **ادمین** و **manehaghighi.com** هر دو وقتی به **api.manehaghighi.com** درخواست می‌زنند، با کانفیگ درست (فایل api.manehaghighi.com + map در nginx.conf) دیگر نباید CORS بگیرند.
- **فایل اصلی** برای سایت: **manehaghighi** (بدون بلوک api).
- **فایل اصلی** برای API و CORS: **api.manehaghighi.com** (با CORS و بعد از include کردن map در nginx.conf).
