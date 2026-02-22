# nginx — حقیقی (manehaghighi)

یک فایل کانفیگ واحد برای ادمین، API و فرانت با HTTPS و CORS و آپلود تا ۲۰ گیگ.

## دامنه‌ها و پورت‌ها

| دامنه | سرویس | پورت پیش‌فرض (روی سرور) |
|--------|--------|---------------------------|
| admin.manehaghighi.com | پنل ادمین | 8082 |
| api.manehaghighi.com | بک‌اند API + استریم /uploads | 8080 |
| manehaghighi.com / www | فرانت | 8081 |

در صورت استفاده از docker معمولی: بک‌اند 3000، فرانت 3002، ادمین 3001 — در فایل `haghighi.conf` مقدار `proxy_pass` را با این پورت‌ها عوض کنید.

## نصب روی سرور

1. **کپی فایل کانفیگ**
   - محتوای `haghighi.conf` را در سرور در مسیر `/etc/nginx/sites-available/haghighi` قرار دهید.
   - فقط یک فایل در `sites-enabled` برای این سایت کافی است؛ بقیهٔ سایتی که با این دامنه‌ها تداخل دارند را غیرفعال کنید (مثلاً لینک را از sites-enabled حذف کنید).

2. **فعال کردن سایت**
   ```bash
   sudo ln -sf /etc/nginx/sites-available/haghighi /etc/nginx/sites-enabled/
   ```

3. **HTTPS (اولین بار)**
   - DNS هر سه دامنه باید به IP همین سرور اشاره کند.
   - اسکریپت را اجرا کنید:
     ```bash
     chmod +x server-config/nginx/setup-https.sh
     export CERTBOT_EMAIL=admin@manehaghighi.com
     ./server-config/nginx/setup-https.sh
     ```
   - اگر مسیر گواهی در سرور با نام پوشهٔ پیش‌فرض فرق داشت (مثلاً `manehaghighi.com-0001`)، در `haghighi.conf` مسیرهای `ssl_certificate` و `ssl_certificate_key` را اصلاح کنید.

4. **تست و ریلود**
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

## محتویات کانفیگ

- **CORS:** برای درخواست از admin، فرانت و api؛ متدهای GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD.
- **آپلود:** حداکثر ۲۰ گیگ برای API (`client_max_body_size 20G`).
- **استریم:** مسیر `/uploads/stream/` روی api.manehaghighi.com برای پخش ویدیو/صدا با Range و CORS.
- **HTTPS:** ریدایرکت خودکار از پورت ۸۰ به ۴۴۳ برای همهٔ دامنه‌ها.

این فایل باید از **داخل بلوک `http { }`** لود شود (مثلاً با `include /etc/nginx/sites-enabled/*;` در nginx.conf). بلوک `map` برای CORS در ابتدای همین فایل قرار دارد.
