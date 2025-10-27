# ⚡ راه‌اندازی سریع - Quick Start

## 🎯 دستورات کلیدی برای دیپلوی

### 1️⃣ انتقال پروژه به سرور

```bash
# از کامپیوتر محلی
cd /Users/arash/Desktop/new-haghighi
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  ./ root@185.231.112.84:/root/new-haghighi/
```

### 2️⃣ اتصال به سرور

```bash
ssh root@185.231.112.84
```

### 3️⃣ پاک کردن همه چیز داکر

```bash
cd /root/new-haghighi
chmod +x cleanup-docker.sh
./cleanup-docker.sh
```

### 4️⃣ دیپلوی از صفر

```bash
chmod +x deploy-from-scratch.sh
./deploy-from-scratch.sh
```

## ✅ تمام!

پروژه شما آماده است:
- 🌐 سایت: http://185.231.112.84/
- 👨‍💼 ادمین: http://185.231.112.84/admin/
- 🔌 API: http://185.231.112.84/api/

---

## 🔧 دستورات مفید

```bash
# مشاهده لاگ‌ها
docker-compose -f docker-compose.prod.yml logs -f

# ری‌استارت
docker-compose -f docker-compose.prod.yml restart

# متوقف کردن
docker-compose -f docker-compose.prod.yml down

# مشاهده وضعیت
docker-compose -f docker-compose.prod.yml ps
```

