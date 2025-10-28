# 🚀 Deploy سریع روی سرور 185.231.112.84

## ✅ دستورات سریع (Copy/Paste)

### روی سرور خودتون:

```bash
# 1. نصب Docker (اگر نصب نیست)
curl -fsSL https://get.docker.com | sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 2. Clone پروژه
git clone https://github.com/arashioz/man-haghighi-mono-repo.git
cd man-haghighi-mono-repo

# 3. تنظیم Environment (فایل آماده است!)
cp server.env .env

# 4. باز کردن پورت‌ها
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp
sudo ufw --force enable

# 5. Deploy!
./deploy.sh
```

**همین!** ✨

---

## 🌐 آدرس‌های دسترسی

بعد از deploy:

- **Frontend (وب‌سایت):** http://185.231.112.84:3002
- **Admin Panel (پنل مدیریت):** http://185.231.112.84:3001
- **Backend API:** http://185.231.112.84:3000/api
- **API Docs (Swagger):** http://185.231.112.84:3000/api/docs

---

## 🔄 به‌روزرسانی (Update)

```bash
cd man-haghighi-mono-repo
git pull origin master
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 دستورات مفید

```bash
# دیدن لاگ‌ها
docker-compose logs -f

# دیدن وضعیت
docker-compose ps

# ری‌استارت
docker-compose restart

# متوقف کردن
docker-compose down

# شروع مجدد
docker-compose up -d
```

---

## 🐛 اگر مشکلی بود

### تست local روی سرور:
```bash
curl http://localhost:3002/
curl http://localhost:3001/
curl http://localhost:3000/api/health
```

### دیدن لاگ‌ها:
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs admin
```

### شروع از صفر:
```bash
docker-compose down -v
docker system prune -af
./deploy.sh
```

---

## 🔒 امنیت

**نکته:** پسوردها در فایل `server.env` قوی تنظیم شده‌اند. اگر می‌خواهید تغییر بدید:

```bash
nano .env
# تغییر POSTGRES_PASSWORD و JWT_SECRET
docker-compose down
docker-compose up -d --build
```

---

## 📞 مشکل داشتید؟

لاگ‌ها رو ذخیره کنید:
```bash
docker-compose logs > logs.txt
docker-compose ps > status.txt
```

---

**همه چی آماده است! فقط دستورات بالا رو روی سرور اجرا کنید.** 🎉

