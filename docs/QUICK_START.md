# راهنمای سریع راه‌اندازی

## مرحله 1: راه‌اندازی دیتابیس

```bash
# فقط دیتابیس را راه‌اندازی کنید
docker-compose -f docker-compose-alt-ports.yml up -d postgres

# بررسی آماده بودن (منتظر بمانید تا "accepting connections" ببینید)
docker logs haghighi_postgres -f
# وقتی دیدید "database system is ready to accept connections" می‌توانید ادامه دهید
```

## مرحله 2: اجرای مایگریشن‌ها (دستی)

```bash
# اجرای مایگریشن‌ها
docker exec haghighi_backend ./scripts/migrate.sh

# یا مستقیم:
docker exec haghighi_backend npx prisma migrate deploy
```

## مرحله 3: راه‌اندازی Backend

```bash
# راه‌اندازی backend
docker-compose -f docker-compose-alt-ports.yml up -d backend

# بررسی لاگ‌ها
docker logs haghighi_backend -f
```

## دستورات یک خطی

```bash
# همه چیز در یک خط
docker-compose -f docker-compose-alt-ports.yml up -d postgres && \
sleep 10 && \
docker exec haghighi_backend npx prisma migrate deploy && \
docker-compose -f docker-compose-alt-ports.yml up -d backend
```

## عیب‌یابی

### Backend نمی‌تواند به دیتابیس متصل شود

```bash
# بررسی postgres
docker ps | grep postgres
docker logs haghighi_postgres --tail 20

# بررسی network
docker exec haghighi_backend ping -c 3 postgres

# بررسی DATABASE_URL
docker exec haghighi_backend env | grep DATABASE_URL
```

### مایگریشن‌ها اجرا نمی‌شوند

```bash
# بررسی وضعیت
docker exec haghighi_backend npx prisma migrate status

# بررسی فایل‌های مایگریشن
docker exec haghighi_backend ls -la /app/prisma/migrations/
```

