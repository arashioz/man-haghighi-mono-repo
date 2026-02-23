# خروجی CSV و دانلود از سرور

## ۱) خروجی کاربران بدون شماره و بدون ایمیل

روی **سرور** (داخل پوشهٔ بک‌اند):

```bash
cd /path/to/new-haghighi/backend
npx ts-node scripts/export-users-no-phone-no-email.ts
```

فایل ساخته می‌شود در:  
`backend/exports/users-no-phone-no-email.csv`

### دانلود فایل CSV روی لپ‌تاپ (لینوکس / مک)

از **همان مسیری که پروژه را روی سرور گذاشتی** استفاده کن (مثلاً `/var/www/new-haghighi` یا `~/new-haghighi`).

```bash
# از لپ‌تاپ اجرا کن (USER و SERVER و مسیر را عوض کن)
scp USER@SERVER:/path/to/new-haghighi/backend/exports/users-no-phone-no-email.csv .
```

مثال با کاربر `root` و آی‌پی سرور:

```bash
scp root@194.180.11.193:/var/www/new-haghighi/backend/exports/users-no-phone-no-email.csv .
```

اگر با **Docker** اجرا می‌کنی و اسکریپت داخل کانتینر اجرا شده، فایل ممکن است داخل کانتینر باشد. در آن صورت یا volume به پوشهٔ `exports` ببند، یا بعد از اجرای اسکریپت کپی بگیر:

```bash
docker cp BACKEND_CONTAINER_NAME:/app/exports/users-no-phone-no-email.csv .
```

---

## ۲) نرمال‌سازی شماره‌های +98

شماره‌هایی مثل `+989385885965` به `09385885965` تبدیل می‌شوند.

```bash
cd backend
# پیش‌نمایش (بدون تغییر در دیتابیس)
npx ts-node scripts/normalize-phone-plus98.ts

# اعمال تغییرات
npx ts-node scripts/normalize-phone-plus98.ts --apply
```

یا:

```bash
npm run normalize:phone-plus98
```
