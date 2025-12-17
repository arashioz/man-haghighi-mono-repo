# راهنمای Migration دیتابیس

این راهنما برای اجرای migration‌های Prisma روی سرور است.

## مشکل فعلی

اگر خطای زیر را می‌بینید:
```
Error: P3006
Migration `20250101000000_add_podcast_thumbnail` failed to apply cleanly to the shadow database.
Error: The underlying table for model `podcasts` does not exist.
```

این به این معنی است که migration‌ها به ترتیب درست اجرا نشده‌اند.

## راه‌حل‌ها

### 1. اجرای همه Migration‌ها (توصیه می‌شود)

برای اجرای همه migration‌های pending به ترتیب:

```bash
# روی سرور
cd /path/to/new-haghighi
npm run db:migrate
```

یا مستقیماً:
```bash
docker exec haghighi_backend npx prisma migrate deploy
```

این دستور:
- همه migration‌های pending را به ترتیب اجرا می‌کند
- فقط migration‌هایی که قبلاً اجرا نشده‌اند را اجرا می‌کند
- برای production مناسب است

### 2. Reset و اجرای مجدد (فقط برای Development)

⚠️ **هشدار**: این دستور تمام داده‌های دیتابیس را پاک می‌کند!

```bash
# روی سرور
cd /path/to/new-haghighi
npm run db:migrate:reset
```

یا مستقیماً:
```bash
docker exec haghighi_backend npx prisma migrate reset --force
```

### 3. استفاده از اسکریپت‌های آماده

#### اجرای Migration‌ها:
```bash
cd backend
npm run migrate:run
```

یا از داخل container:
```bash
docker exec haghighi_backend sh scripts/run-migrations.sh
```

#### Reset و Migration (Development):
```bash
cd backend
npm run migrate:reset
```

یا از داخل container:
```bash
docker exec haghighi_backend sh scripts/reset-and-migrate.sh
```

## در Deploy Script

اسکریپت `deploy.sh` به‌روزرسانی شده و حالا از `prisma migrate deploy` استفاده می‌کند که:
- همه migration‌ها را به ترتیب اجرا می‌کند
- فقط migration‌های pending را اجرا می‌کند
- برای production مناسب است

## Migration جدید: Rate Limiting Fields

Migration جدید برای فیلدهای rate limiting اضافه شده:
- `isBlocked`: وضعیت بلاک بودن کاربر
- `blockedUntil`: زمان پایان بلاک
- `rateLimitViolations`: تعداد تخلفات
- `lastRateLimitViolation`: زمان آخرین تخلف

این migration در فایل زیر قرار دارد:
```
backend/prisma/migrations/20250120000000_add_rate_limiting_fields/migration.sql
```

## بررسی وضعیت Migration‌ها

برای دیدن وضعیت migration‌ها:

```bash
docker exec haghighi_backend npx prisma migrate status
```

## عیب‌یابی

### اگر migration‌ها اجرا نمی‌شوند:

1. بررسی کنید که container در حال اجرا است:
   ```bash
   docker ps | grep haghighi_backend
   ```

2. بررسی لاگ‌های container:
   ```bash
   docker logs haghighi_backend
   ```

3. بررسی اتصال به دیتابیس:
   ```bash
   docker exec haghighi_postgres pg_isready -U haghighi_user
   ```

4. بررسی فایل `.env`:
   ```bash
   cat .env | grep DATABASE_URL
   ```

### اگر migration خاصی مشکل دارد:

می‌توانید migration خاصی را skip کنید (با احتیاط):

```bash
# فقط برای موارد اضطراری
docker exec haghighi_backend npx prisma migrate resolve --applied <migration_name>
```

## نکات مهم

1. **همیشه backup بگیرید** قبل از اجرای migration‌ها
2. **در production** از `prisma migrate deploy` استفاده کنید
3. **در development** می‌توانید از `prisma migrate dev` استفاده کنید
4. **هرگز** migration‌ها را به صورت دستی تغییر ندهید بعد از اجرا

## دستورات مفید

```bash
# Generate Prisma Client
docker exec haghighi_backend npx prisma generate

# مشاهده وضعیت migration‌ها
docker exec haghighi_backend npx prisma migrate status

# اجرای migration‌ها
docker exec haghighi_backend npx prisma migrate deploy

# باز کردن Prisma Studio
docker exec haghighi_backend npx prisma studio
```





