# راهنمای پاک‌سازی Docker و حل مشکل "No space left on device"

## مشکل
در هنگام build کردن Docker image، خطای "No space left on device" رخ می‌دهد. این مشکل معمولاً به دلیل:
- پر شدن فضای دیسک توسط Docker images و cache
- استفاده بیش از حد از فضای Docker

## راه‌حل‌ها

### 1. پاک‌سازی سریع با اسکریپت

```bash
# اجرای اسکریپت پاک‌سازی
./clean-docker.sh
```

این اسکریپت:
- تمام containerهای متوقف شده را حذف می‌کند
- تمام imageهای استفاده نشده را حذف می‌کند
- build cache را پاک می‌کند
- volumeهای استفاده نشده را حذف می‌کند

### 2. پاک‌سازی دستی

```bash
# بررسی فضای استفاده شده
docker system df

# پاک‌سازی کامل (همه چیز)
docker system prune -a --volumes -f

# پاک‌سازی فقط build cache
docker builder prune -a -f

# حذف imageهای خاص
docker rmi $(docker images -q)

# حذف containerهای متوقف شده
docker container prune -f
```

### 3. بررسی فضای دیسک

```bash
# بررسی فضای کل دیسک
df -h

# بررسی فضای Docker
du -sh ~/Library/Containers/com.docker.docker

# بررسی فضای پروژه
du -sh node_modules backend/node_modules frontend/node_modules admin-panel/node_modules
```

### 4. بهینه‌سازی Dockerfile

Dockerfile بهینه شده است تا:
- از `--chown` در COPY استفاده کند (به جای chown بعدی)
- فقط فایل‌های ضروری را chown کند
- از chown روی کل `/app` جلوگیری کند

### 5. راه‌اندازی مجدد Docker Desktop

اگر مشکل ادامه داشت:

```bash
# بستن Docker Desktop
# سپس باز کردن مجدد آن

# یا restart کردن Docker daemon
killall Docker && open /Applications/Docker.app
```

## پیشگیری

برای جلوگیری از این مشکل در آینده:

1. **پاک‌سازی منظم**: هر هفته یکبار Docker را پاک کنید
2. **محدود کردن فضای Docker**: در تنظیمات Docker Desktop، فضای اختصاص داده شده را محدود کنید
3. **استفاده از .dockerignore**: فایل‌های غیرضروری را در build قرار ندهید

## بررسی بعد از پاک‌سازی

```bash
# بررسی فضای آزاد شده
docker system df

# Build مجدد
docker-compose build

# یا
docker-compose up --build
```

## نکات مهم

- ⚠️ پاک‌سازی کامل تمام imageها و containerها را حذف می‌کند
- ✅ قبل از پاک‌سازی، مطمئن شوید که imageهای مهم را backup کرده‌اید
- ✅ بعد از پاک‌سازی، باید دوباره build کنید

