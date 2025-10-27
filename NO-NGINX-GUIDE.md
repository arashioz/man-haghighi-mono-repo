# 🚀 راهنمای دیپلوی بدون Nginx

## 📋 تفاوت‌ها

### با Nginx (پیش‌فرض):
- ✅ همه چیز روی پورت 80
- ✅ مسیرهای ساده: `/`, `/admin/`, `/api/`
- ✅ یک IP و پورت برای همه چیز
- ❌ یک لایه اضافه (Nginx)

### بدون Nginx:
- ✅ ساده‌تر، بدون reverse proxy
- ✅ دسترسی مستقیم به سرویس‌ها
- ❌ باید پورت‌های متفاوت باز کنی
- ❌ آدرس‌ها شامل شماره پورت

---

## ⚡ دیپلوی بدون Nginx

### روی سرور:

```bash
ssh root@185.231.112.84
cd /root/new-haghighi

# دیپلوی بدون Nginx
chmod +x deploy-no-nginx.sh
./deploy-no-nginx.sh
```

---

## 🌐 آدرس‌های دسترسی

بعد از دیپلوی بدون Nginx:

| سرویس | آدرس |
|-------|------|
| Frontend | http://185.231.112.84:3002/ |
| Admin Panel | http://185.231.112.84:3001/ |
| Backend API | http://185.231.112.84:3000/api/ |
| API Docs | http://185.231.112.84:3000/api/docs/ |
| Uploads | http://185.231.112.84:3000/uploads/ |
| Database | localhost:5432 (internal) |

---

## 🔐 باز کردن پورت‌ها در فایروال

حتماً پورت‌ها رو باز کن:

```bash
# پورت‌های ضروری
sudo ufw allow 3000/tcp  # Backend API
sudo ufw allow 3001/tcp  # Admin Panel
sudo ufw allow 3002/tcp  # Frontend
sudo ufw allow 22/tcp    # SSH

# فعال کردن فایروال
sudo ufw enable

# بررسی وضعیت
sudo ufw status
```

---

## 📊 دستورات مفید

### مشاهده وضعیت
```bash
docker-compose -f docker-compose-no-nginx.yml ps
```

### مشاهده لاگ‌ها
```bash
docker-compose -f docker-compose-no-nginx.yml logs -f
```

### ری‌استارت
```bash
docker-compose -f docker-compose-no-nginx.yml restart
```

### متوقف کردن
```bash
docker-compose -f docker-compose-no-nginx.yml down
```

### شروع مجدد
```bash
docker-compose -f docker-compose-no-nginx.yml up -d
```

---

## 🔄 تغییر از Nginx به بدون Nginx

اگر قبلاً با Nginx دیپلوی کردی:

```bash
# متوقف کردن نسخه با Nginx
docker-compose -f docker-compose.prod.yml down

# دیپلوی بدون Nginx
./deploy-no-nginx.sh
```

---

## 🔄 برگشت به Nginx

اگر میخوای دوباره از Nginx استفاده کنی:

```bash
# متوقف کردن نسخه بدون Nginx
docker-compose -f docker-compose-no-nginx.yml down

# دیپلوی با Nginx
./simple-deploy.sh
```

---

## ⚠️ نکات مهم

1. **پورت‌ها**: مطمئن شو پورت‌های 3000, 3001, 3002 باز هستن
2. **فایروال**: حتماً `ufw allow` کن
3. **CORS**: Backend پیکربندی شده برای پورت‌های مختلف
4. **آدرس‌ها**: همه آدرس‌ها شامل شماره پورت هستن

---

## 🆚 کدوم رو انتخاب کنم؟

### استفاده از Nginx (توصیه میشه) اگر:
- ✅ میخوای آدرس‌های ساده داشته باشی
- ✅ میخوای همه چیز روی پورت 80 باشه
- ✅ میخوای SSL/HTTPS اضافه کنی
- ✅ میخوای load balancing داشته باشی

### بدون Nginx اگر:
- ✅ میخوای ساده‌ترین setup ممکن رو
- ✅ مشکل با Nginx داری
- ✅ فقط برای تست/دولوپمنت
- ✅ پورت‌های متفاوت مشکلی نیست

---

## 🧪 تست دیپلوی

```bash
# تست Backend
curl http://185.231.112.84:3000/api/health

# تست Frontend
curl http://185.231.112.84:3002/

# تست Admin
curl http://185.231.112.84:3001/

# مشاهده پورت‌های باز
sudo netstat -tulpn | grep LISTEN
```

---

✨ **موفق باشید!**

