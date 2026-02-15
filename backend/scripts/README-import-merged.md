# ایمپورت دیتای final_merged_data_cleaned به دیتابیس پروداکشن

اسکریپت `import-merged-to-production.ts` کاربران و محصولات قدیمی (OldProduct) را از فایل `final_merged_data_cleaned.json` وارد دیتابیس می‌کند.

## منطق

- **اگر کاربر در دیتابیس نبود** → کاربر ساخته می‌شود (`isOld: true`) و همه محصولاتش در جدول `old_products` ثبت می‌شوند.
- **اگر کاربر بود** → فقط رکوردهای OldProduct که قبلاً نبودند اضافه می‌شوند (تکراری نمی‌سازد).

## اجرا روی سرور (بدون داکر)

```bash
cd backend
export DATABASE_URL="postgresql://USER:PASS@HOST:5432/DBNAME"
npm run import:merged
```

اگر فایل JSON جای دیگری است:

```bash
DATA_FILE=/path/to/final_merged_data_cleaned.json npm run import:merged
```

## اجرا با داکر (دیتابیس پروداکشن)

۱. فایل JSON را در مسیری که کانتینر به آن دسترسی دارد قرار بده (مثلاً مونت شده یا داخل image).

۲. یکی از این روش‌ها:

**الف) اجرا داخل کانتینر بکند (فایل از volume):**

```bash
# فرض: backend در docker-compose با سرویس نام backend است و volume داره
docker compose exec backend sh -c 'DATA_FILE=/path/inside/container/final_merged_data_cleaned.json npm run import:merged'
```

اگر فایل در `moc-old-data` پروژه مونت شده:

```bash
# در docker-compose volume داشته باش: ./moc-old-data:/app/moc-old-data
docker compose exec backend npm run import:merged
```

**ب) اجرا با دیتابیس پروداکشن از بیرون داکر:**

```bash
cd backend
export DATABASE_URL="postgresql://USER:PASS@HOST:5432/DBNAME"
DATA_FILE=../moc-old-data/final_merged_data_cleaned.json npm run import:merged
```

در هر حالت باید `DATABASE_URL` به دیتابیس پروداکشنی اشاره کند که مایگریشن روی آن اجرا شده است.
