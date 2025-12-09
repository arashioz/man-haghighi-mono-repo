# راهنمای عیب‌یابی اتصال به دیتابیس

## مشکل: Cannot connect to database

### مرحله 1: بررسی وضعیت Containers

```bash
# بررسی تمام containers
docker ps -a

# بررسی postgres
docker ps | grep postgres

# بررسی backend
docker ps | grep backend
```

### مرحله 2: بررسی Postgres Container

```bash
# بررسی لاگ‌های postgres
docker logs haghighi_postgres --tail 50

# بررسی آماده بودن postgres
docker exec haghighi_postgres pg_isready -U haghighi_user -d haghighi_db

# بررسی وضعیت healthcheck
docker inspect haghighi_postgres | grep -A 10 Health
```

### مرحله 3: بررسی Network

```bash
# بررسی network
docker network ls
docker network inspect new-haghighi_backend_network

# تست ping از backend به postgres
docker exec haghighi_backend ping -c 3 postgres

# بررسی DNS resolution
docker exec haghighi_backend nslookup postgres
```

### مرحله 4: بررسی DATABASE_URL

```bash
# بررسی DATABASE_URL در backend container
docker exec haghighi_backend env | grep DATABASE_URL

# بررسی .env file
cat .env | grep DATABASE_URL

# بررسی متغیرهای postgres
docker exec haghighi_postgres env | grep POSTGRES
```

### مرحله 5: تست اتصال دستی

```bash
# تست اتصال از backend
docker exec haghighi_backend ./scripts/check-db.sh

# یا مستقیم:
docker exec haghighi_backend npx prisma db execute --stdin <<EOF
SELECT version();
EOF
```

### مرحله 6: بررسی Prisma Connection

```bash
# بررسی وضعیت Prisma
docker exec haghighi_backend npx prisma migrate status

# تست اتصال با Prisma
docker exec haghighi_backend npx prisma db pull --print
```

## راه‌حل‌های رایج

### مشکل 1: Postgres Container در حال اجرا نیست

```bash
# راه‌اندازی postgres
docker-compose -f docker-compose-alt-ports.yml up -d postgres

# منتظر بمانید تا آماده شود
docker logs haghighi_postgres -f
# وقتی "database system is ready to accept connections" دیدید، Ctrl+C کنید
```

### مشکل 2: Network مشکل دارد

```bash
# بررسی network
docker network inspect new-haghighi_backend_network | grep -A 5 Containers

# اگر backend در network نیست، restart کنید
docker-compose -f docker-compose-alt-ports.yml restart backend
```

### مشکل 3: DATABASE_URL اشتباه است

```bash
# بررسی .env file
cat .env | grep -E "DATABASE_URL|POSTGRES"

# فرمت صحیح:
# DATABASE_URL=postgresql://haghighi_user:password@postgres:5432/haghighi_db?schema=public

# اگر اشتباه است، اصلاح کنید
nano .env
# یا
vim .env

# سپس restart کنید
docker-compose -f docker-compose-alt-ports.yml restart backend
```

### مشکل 4: Postgres هنوز آماده نیست

```bash
# منتظر بمانید و دوباره تست کنید
sleep 10
docker exec haghighi_postgres pg_isready -U haghighi_user -d haghighi_db

# اگر هنوز آماده نیست، لاگ‌ها را بررسی کنید
docker logs haghighi_postgres --tail 100
```

## دستورات سریع عیب‌یابی

```bash
# همه چیز در یک خط
echo "=== Containers ===" && \
docker ps -a | grep -E "haghighi|CONTAINER" && \
echo "" && \
echo "=== Postgres Status ===" && \
docker exec haghighi_postgres pg_isready -U haghighi_user -d haghighi_db && \
echo "" && \
echo "=== Network Test ===" && \
docker exec haghighi_backend ping -c 2 postgres && \
echo "" && \
echo "=== DATABASE_URL ===" && \
docker exec haghighi_backend env | grep DATABASE_URL && \
echo "" && \
echo "=== Connection Test ===" && \
docker exec haghighi_backend ./scripts/check-db.sh
```

## اگر هنوز مشکل دارید

1. **Restart همه چیز:**
```bash
docker-compose -f docker-compose-alt-ports.yml down
docker-compose -f docker-compose-alt-ports.yml up -d postgres
sleep 15
docker-compose -f docker-compose-alt-ports.yml up -d backend
```

2. **بررسی لاگ‌های کامل:**
```bash
docker logs haghighi_postgres --tail 100
docker logs haghighi_backend --tail 100
```

3. **بررسی فایل‌های .env:**
```bash
# بررسی .env در root
cat .env

# بررسی .env در backend (اگر وجود دارد)
cat backend/.env 2>/dev/null || echo "No backend/.env file"
```


