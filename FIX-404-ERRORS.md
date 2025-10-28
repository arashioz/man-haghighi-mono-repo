# Fix for 404 Errors After Deployment

## مشکلات (Problems Identified)

### 1. Admin Panel - 404 Static Files
**مشکل:** فایل‌های استاتیک (CSS, JS, manifest.json) پیدا نمی‌شدند.

**علت:** 
- در `admin-panel/package.json` فیلد `"homepage": "/admin"` تنظیم شده بود
- این باعث می‌شد React فایل‌ها را در مسیر `/admin/static/...` بسازد
- اما nginx روی پورت 3001 فایل‌ها را از مسیر `/` سرو می‌کرد

**حل شده:** 
- Dockerfile اکنون `PUBLIC_URL=/` را تنظیم می‌کند
- فیلد homepage قبل از build حذف می‌شود

### 2. Frontend & Admin Panel - API 404 Errors
**مشکل:** API calls به `http://185.231.112.84:3002/api` می‌رفتند به جای `http://185.231.112.84:3000/api`

**علت:**
- متغیر محیطی `REACT_APP_API_URL` در زمان BUILD باید تنظیم شود، نه runtime
- در React، environment variables در زمان build در کد JavaScript جایگذاری می‌شوند
- docker-compose فقط runtime environment را تنظیم می‌کرد
- کد build شده fallback به `window.location.origin/api` می‌کرد که پورت اشتباه بود

**حل شده:**
- Dockerfiles اکنون `ARG REACT_APP_API_URL` می‌گیرند
- docker-compose build args را به Dockerfiles پاس می‌دهد
- API URL در زمان build در کد جایگذاری می‌شود

## تغییرات انجام شده (Changes Made)

### 1. `admin-panel/Dockerfile.no-nginx`
```dockerfile
# Added build-time environment variables
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Set PUBLIC_URL to root
ENV PUBLIC_URL=/
```

### 2. `frontend/Dockerfile.no-nginx`
```dockerfile
# Added build-time environment variables
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
```

### 3. `docker-compose-no-nginx.yml`
```yaml
admin-panel:
  build:
    context: ./admin-panel
    dockerfile: Dockerfile.no-nginx
    args:  # ← Added build args
      REACT_APP_API_URL: ${REACT_APP_API_URL:-http://185.231.112.84:3000/api}

frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile.no-nginx
    args:  # ← Added build args
      REACT_APP_API_URL: ${REACT_APP_API_URL:-http://185.231.112.84:3000/api}
```

## نحوه دیپلوی (How to Deploy)

### روش سریع (Quick Method)
روی سرور، این دستور را اجرا کنید:

```bash
cd /path/to/new-haghighi
./fix-and-redeploy.sh
```

### روش دستی (Manual Method)
```bash
cd /path/to/new-haghighi

# Stop containers
docker-compose -f docker-compose-no-nginx.yml down

# Remove old images
docker rmi new-haghighi_frontend new-haghighi_admin-panel 2>/dev/null || true

# Rebuild with no cache
docker-compose -f docker-compose-no-nginx.yml \
  --env-file production-no-nginx.env \
  build --no-cache frontend admin-panel

# Start services
docker-compose -f docker-compose-no-nginx.yml \
  --env-file production-no-nginx.env \
  up -d

# Check status
docker-compose -f docker-compose-no-nginx.yml ps

# View logs
docker-compose -f docker-compose-no-nginx.yml logs -f
```

## تست (Testing)

بعد از دیپلوی، این آدرس‌ها را بررسی کنید:

### Frontend
```bash
# باید صفحه اصلی نمایش داده شود
curl http://185.231.112.84:3002/

# باید فایل JS برگردد
curl -I http://185.231.112.84:3002/static/js/main.*.js
```

### Admin Panel
```bash
# باید صفحه ادمین نمایش داده شود
curl http://185.231.112.84:3001/

# باید فایل CSS برگردد
curl -I http://185.231.112.84:3001/static/css/main.*.css
```

### API Calls
باز کردن Console مرورگر (F12) و چک کردن:
- API calls باید به `http://185.231.112.84:3000/api/...` بروند
- نباید خطای 404 داشته باشید

## نکات مهم (Important Notes)

1. **Cache مرورگر را پاک کنید:**
   - Ctrl+Shift+Delete (Chrome/Edge)
   - Cmd+Shift+Delete (Safari)
   - یا از Incognito/Private mode استفاده کنید

2. **پورت‌ها باید باز باشند:**
   ```bash
   sudo ufw status
   sudo ufw allow 3000/tcp
   sudo ufw allow 3001/tcp
   sudo ufw allow 3002/tcp
   ```

3. **فایل environment:**
   - مطمئن شوید `production-no-nginx.env` در مسیر اصلی پروژه موجود است
   - `REACT_APP_API_URL=http://185.231.112.84:3000/api` صحیح باشد

4. **اگر هنوز مشکل دارید:**
   ```bash
   # کامل پاک کردن و از نو شروع
   docker-compose -f docker-compose-no-nginx.yml down -v
   docker system prune -af
   ./deploy-no-nginx.sh
   ```

## لاگ‌ها (Logs)

برای دیدن لاگ‌ها:
```bash
# همه سرویس‌ها
docker-compose -f docker-compose-no-nginx.yml logs -f

# فقط frontend
docker-compose -f docker-compose-no-nginx.yml logs -f frontend

# فقط admin-panel
docker-compose -f docker-compose-no-nginx.yml logs -f admin-panel

# فقط backend
docker-compose -f docker-compose-no-nginx.yml logs -f backend
```

## خلاصه (Summary)

✅ **Fixed:**
- Admin panel static files now load correctly (removed `/admin` base path)
- API calls now go to correct port 3000 instead of 3002
- Environment variables properly passed at build time

✅ **Files Modified:**
- `admin-panel/Dockerfile.no-nginx`
- `frontend/Dockerfile.no-nginx`
- `docker-compose-no-nginx.yml`

✅ **New Files:**
- `fix-and-redeploy.sh` - Quick redeploy script

---

**وضعیت:** ✅ آماده برای دیپلوی (Ready to Deploy)

فقط اسکریپت `fix-and-redeploy.sh` را روی سرور اجرا کنید!


