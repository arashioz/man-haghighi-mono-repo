# Environment Configuration Guide

## Local Development

برای محیط لوکال، از فایل `local.env` استفاده کنید:

```bash
# استفاده از فایل محیط لوکال
docker-compose --env-file local.env up -d
```

### تنظیمات پیش‌فرض لوکال:
- **Database:** PostgreSQL با کاربر `haghighi_user` و رمز `haghighiPassword`
- **JWT Secret:** `local-dev-jwt-secret-key-not-for-production`
- **API URL:** `http://localhost:3000`

## Production

برای محیط تولید، از فایل `production.env` استفاده کنید:

```bash
# استفاده از فایل محیط تولید
docker-compose -f docker-compose.prod.yml --env-file production.env up -d
```

### تنظیمات تولید:
- **Database:** PostgreSQL با رمز امن `HaghighiSecure2024!@#`
- **JWT Secret:** `HaghighiJWTSecret2024!@#$%^&*()_+SecureKey`
- **API URL:** `http://194.180.11.193:3000`

## دستورات مفید

### شروع محیط لوکال:
```bash
docker-compose --env-file local.env up -d
```

### شروع محیط تولید:
```bash
docker-compose -f docker-compose.prod.yml --env-file production.env up -d
```

### مشاهده لاگ‌ها:
```bash
# لوکال
docker logs haghighi_backend

# تولید
docker logs haghighi_backend_prod
```

### اجرای migration:
```bash
# لوکال
docker exec haghighi_backend npx prisma migrate deploy

# تولید
docker exec haghighi_backend_prod npx prisma migrate deploy
```
