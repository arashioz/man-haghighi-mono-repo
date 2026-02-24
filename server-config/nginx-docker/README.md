# nginx داخل Docker (پروداکشن)

این پوشه برای اجرای nginx **داخل کانتینر** در کنار backend، frontend و admin است.

## فایل‌ها

- **nginx.conf** — کانفیگ اصلی nginx (worker، log، includeی conf.d)
- **conf.d/haghighi.conf** — سه سرور مجازی: admin، API، فرانت + CORS و آپلود ۲۰G
- **options-ssl-nginx.conf** — تنظیمات SSL (TLS 1.2/1.3، cipherها)

## وابستگی‌ها

- گواهی‌های Let’s Encrypt در `/etc/letsencrypt/live/` روی سرور (با certbot)
- فایل `ssl-dhparams.pem` در `/etc/letsencrypt/` (با دستور `openssl dhparam`)

راهنمای کامل دیپلوی در **DEPLOY.md** در ریشه پروژه است.
