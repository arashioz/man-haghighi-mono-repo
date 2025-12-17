# دستورات Migration و Seed برای سرور

## روش 1: استفاده از اسکریپت (پیشنهادی)

```bash
./run-migration-seed.sh
```

## روش 2: دستورات دستی

### 1. Migration (اجرای مایگریشن‌ها)

```bash
docker exec haghighi_backend sh -c "cd /app && npx prisma migrate deploy"
```

یا با استفاده از اسکریپت migrate.sh:

```bash
docker exec haghighi_backend sh -c "cd /app && sh scripts/migrate.sh"
```

### 2. Regenerate Prisma Client

```bash
docker exec haghighi_backend sh -c "cd /app && npx prisma generate"
```

### 3. Seed (پر کردن دیتابیس)

```bash
docker exec haghighi_backend sh -c "cd /app && npm run prisma:seed"
```

## دستورات یکجا (Copy & Paste)

```bash
# Migration
docker exec haghighi_backend sh -c "cd /app && npx prisma migrate deploy"

# Generate Prisma Client
docker exec haghighi_backend sh -c "cd /app && npx prisma generate"

# Seed
docker exec haghighi_backend sh -c "cd /app && npm run prisma:seed"
```

## بررسی وضعیت Migration

```bash
docker exec haghighi_backend sh -c "cd /app && npx prisma migrate status"
```

## حل مشکل Failed Migration (خطای P3009)

اگر خطای زیر را دریافت کردید:

```
Error: P3009
migrate found failed migrations in the target database
The `20250115000000_add_otp_fields` migration started at ... failed
```

### روش 1: استفاده از اسکریپت (پیشنهادی)

```bash
./fix-failed-migration.sh
```

### روش 2: دستورات دستی

ابتدا وضعیت migration را بررسی کنید:

```bash
docker exec haghighi_backend sh -c "cd /app && npx prisma migrate status"
```

سپس migration failed را resolve کنید:

**اگر migration rollback شده باشد:**
```bash
docker exec haghighi_backend sh -c "cd /app && npx prisma migrate resolve --rolled-back 20250115000000_add_otp_fields"
```

**اگر migration واقعاً اجرا شده باشد:**
```bash
docker exec haghighi_backend sh -c "cd /app && npx prisma migrate resolve --applied 20250115000000_add_otp_fields"
```

بعد از resolve، دوباره migration را اجرا کنید:

```bash
docker exec haghighi_backend sh -c "cd /app && npx prisma migrate deploy"
```

## نکات مهم

- قبل از اجرا، مطمئن شوید که کانتینر `haghighi_backend` در حال اجرا است
- برای بررسی کانتینرها: `docker ps | grep haghighi`
- اگر کانتینر در حال اجرا نیست: `docker-compose -f docker-compose-alt-ports.yml up -d backend`
- اگر migration failed دارید، ابتدا آن را resolve کنید قبل از اجرای migration‌های جدید

