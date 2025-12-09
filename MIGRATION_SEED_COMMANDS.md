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

## نکات مهم

- قبل از اجرا، مطمئن شوید که کانتینر `haghighi_backend` در حال اجرا است
- برای بررسی کانتینرها: `docker ps | grep haghighi`
- اگر کانتینر در حال اجرا نیست: `docker-compose -f docker-compose-alt-ports.yml up -d backend`

