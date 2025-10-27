# 🎯 شروع دیپلوی - اینجا شروع کن!

## 📝 خلاصه سریع

این راهنما برای دیپلوی **کامل** و **از صفر** پلتفرم حقیقی روی سرور **185.231.112.84** است.

---

## ⚡ دستورات به ترتیب اجرا

### 1️⃣ روی کامپیوتر محلی (macOS)

```bash
cd /Users/arash/Desktop/new-haghighi

# آپلود پروژه به سرور
./upload-to-server.sh
```

یا بصورت دستی:
```bash
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  ./ root@185.231.112.84:/root/new-haghighi/
```

---

### 2️⃣ روی سرور (Ubuntu/Debian)

```bash
# اتصال به سرور
ssh root@185.231.112.84

# رفتن به پوشه پروژه
cd /root/new-haghighi

# روش ساده (توصیه میشه!):
chmod +x simple-deploy.sh
./simple-deploy.sh

# یا روش کامل:
chmod +x cleanup-docker.sh deploy-from-scratch.sh
./cleanup-docker.sh
./deploy-from-scratch.sh

# تست دیپلوی (اختیاری)
./test-deployment.sh
```

---

## ✅ بعد از دیپلوی

وب‌سایت شما روی این آدرس‌ها در دسترس است:

- 🌐 **سایت اصلی**: http://185.231.112.84/
- 👨‍💼 **پنل ادمین**: http://185.231.112.84/admin/
- 🔌 **API**: http://185.231.112.84/api/
- 📚 **مستندات API**: http://185.231.112.84/api/docs/
- 📁 **فایل‌های آپلود**: http://185.231.112.84/uploads/

---

## 📦 فایل‌های ایجاد شده

| فایل | کاربرد |
|------|--------|
| `cleanup-docker.sh` | پاک کردن کامل Docker |
| `deploy-from-scratch.sh` | دیپلوی خودکار |
| `upload-to-server.sh` | آپلود به سرور |
| `test-deployment.sh` | تست سلامت |
| `nginx.conf` | پیکربندی Nginx |
| `docker-compose.prod.yml` | Docker Compose |
| `production.env` | متغیرهای محیطی |

---

## 📚 مستندات کامل

- **خیلی عجله دارم**: [QUICK-START.md](QUICK-START.md)
- **دستورات سرور**: [SERVER-COMMANDS.md](SERVER-COMMANDS.md)
- **راهنمای جامع**: [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)
- **خلاصه دیپلوی**: [README-DEPLOYMENT.md](README-DEPLOYMENT.md)

---

## 🐛 مشکل پیش اومد؟

### ❌ اپلود فایل کار نمیکنه
```bash
chmod -R 777 /root/new-haghighi/uploads
docker exec haghighi_backend_prod chmod -R 777 /app/uploads
docker-compose -f docker-compose.prod.yml restart backend nginx
```

### ❌ سرویسی کار نمیکنه
```bash
# مشاهده لاگ
docker logs haghighi_backend_prod -f

# ری‌استارت
docker-compose -f docker-compose.prod.yml restart backend
```

### ❌ همه چیز خراب شده!
```bash
cd /root/new-haghighi
./cleanup-docker.sh
./deploy-from-scratch.sh
```

---

## 🔐 نکته امنیتی مهم!

⚠️ **قبل از استفاده واقعی** رمزهای زیر را در `production.env` تغییر دهید:

```env
POSTGRES_PASSWORD=haghighiSecurePassword2025!
JWT_SECRET=haghighi-super-secure-jwt-secret-key-change-this-2025
```

---

## 📞 دستورات مفید

```bash
# وضعیت
docker-compose -f docker-compose.prod.yml ps

# لاگ‌ها
docker-compose -f docker-compose.prod.yml logs -f

# ری‌استارت
docker-compose -f docker-compose.prod.yml restart

# متوقف
docker-compose -f docker-compose.prod.yml down

# شروع
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🎉 موفق باشید!

اگر این مراحل رو دنبال کردی، پروژه‌ت باید بدون مشکل اجرا بشه! 🚀

