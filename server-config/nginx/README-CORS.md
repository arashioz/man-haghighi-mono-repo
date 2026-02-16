# راهنمای CORS برای API (جلوگیری از Network Error / CORS در لاگین و API)

## هدف
با این تنظیمات، nginx همیشه هدرهای CORS را روی پاسخ‌های API (از جمله 4xx، 5xx و حتی 502 وقتی بک‌اند down است) قرار می‌دهد تا مرورگر پاسخ را مسدود نکند و خطای شبکه/CORS نگیرید.

**دامنه‌های مجاز در map:** admin.manehaghighi.com، sales.manehaghighi.com، manehaghighi.com، www.manehaghighi.com، api.manehaghighi.com، و localhost برای توسعه.

## مراحل روی سرور

### ۱. قرار دادن map در nginx.conf
فایل اصلی nginx معمولاً اینجاست: `/etc/nginx/nginx.conf`

داخل بلوک `http { ... }` (قبل از `include` سایتها) این خط را اضافه کنید:

```nginx
http {
    # ... سایر تنظیمات ...

    # CORS map برای API (originهای مجاز)
    include /etc/nginx/cors-api.map.conf;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

مسیر `include` را مطابق جایی که فایل `cors-api.map.conf` را کپی کرده‌اید تنظیم کنید (مثلاً اگر در همان پوشهٔ `sites-available` است، می‌توانید از مسیر نسبی همان پوشه استفاده کنید).

### ۲. کپی کردن فایل map
فایل `cors-api.map.conf` را در مسیری که در بالا در `include` نوشته‌اید کپی کنید، مثلاً:

```bash
sudo cp /path/to/project/server-config/nginx/cors-api.map.conf /etc/nginx/cors-api.map.conf
```

### ۳. به‌روزرسانی کانفیگ API
فایل `api.conf` (یا همان سایتی که برای `api.manehaghighi.com` استفاده می‌کنید) را با نسخهٔ جدید جایگزین کنید و مطمئن شوید همان `location /` با هدرهای CORS و هندل OPTIONS را دارد.

### ۴. تست و ریلود
```bash
sudo nginx -t && sudo systemctl reload nginx
```

اگر `nginx -t` خطا داد، مسیر `include` یا سینتکس را اصلاح کنید.

## اضافه کردن origin جدید
برای اجازه دادن به دامنهٔ جدید (مثلاً یک زیردامنه دیگر)، در فایل `cors-api.map.conf` یک خط به این شکل اضافه کنید:

```nginx
"~^https://new-subdomain\.manehaghighi\.com$" $http_origin;
```

سپس دوباره `sudo nginx -t && sudo systemctl reload nginx` بزنید.

## نکته
اگر `cors-api.map.conf` را در `http {}` include نکنید، متغیر `$cors_api_origin` خالی می‌ماند و هدر CORS با مقدار خالی فرستاده می‌شود؛ در نتیجه ممکن است در مرورگر باز هم خطا ببینید. حتماً مرحلهٔ ۱ را انجام دهید.
