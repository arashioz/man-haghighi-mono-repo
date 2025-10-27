# 🔧 عیب‌یابی - Troubleshooting

## ❌ خطای RC(1) در اسکریپت‌ها

### علت:
این خطا معمولاً به خاطر تفاوت دستور `sed` در macOS و Linux است.

### راه‌حل:
از اسکریپت ساده استفاده کن:

```bash
./simple-deploy.sh
```

یا بصورت دستی:

```bash
# 1. پاک کردن داکر
docker-compose -f docker-compose.prod.yml down
docker system prune -af --volumes

# 2. بیلد
docker-compose -f docker-compose.prod.yml --env-file production.env build --no-cache

# 3. اجرا
docker-compose -f docker-compose.prod.yml --env-file production.env up -d

# 4. دیتابیس
sleep 15
docker exec haghighi_backend_prod npx prisma db push

# 5. دسترسی‌ها
chmod -R 777 uploads
docker exec haghighi_backend_prod chmod -R 777 /app/uploads
```

---

## ❌ اپلود فایل کار نمیکنه

```bash
# روی سرور
chmod -R 777 /root/new-haghighi/uploads
docker exec haghighi_backend_prod chmod -R 777 /app/uploads
docker-compose -f docker-compose.prod.yml restart backend nginx
```

---

## ❌ Backend وصل نمیشه

```bash
# لاگ رو ببین
docker logs haghighi_backend_prod -f

# ری‌استارت کن
docker-compose -f docker-compose.prod.yml restart backend

# اگر باز کار نکرد، از صفر:
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d backend
```

---

## ❌ دیتابیس کانکت نمیشه

```bash
# چک کن دیتابیس اوکی باشه
docker logs haghighi_postgres_prod

# ری‌استارت کن
docker-compose -f docker-compose.prod.yml restart postgres

# صبر کن و دوباره schema اعمال کن
sleep 10
docker exec haghighi_backend_prod npx prisma db push
```

---

## ❌ Nginx 502 Bad Gateway میده

```bash
# چک کن سرویس‌ها اوکی باشن
docker-compose -f docker-compose.prod.yml ps

# تست کانفیگ nginx
docker exec haghighi_nginx_prod nginx -t

# ری‌استارت nginx
docker-compose -f docker-compose.prod.yml restart nginx

# لاگ nginx
docker logs haghighi_nginx_prod -f
```

---

## ❌ Frontend/Admin لود نمیشه

```bash
# لاگ رو ببین
docker logs haghighi_frontend_prod
docker logs haghighi_admin_prod

# ری‌بیلد کن
docker-compose -f docker-compose.prod.yml up -d --build frontend admin-panel
```

---

## ❌ Port در حال استفاده است

```bash
# ببین چی داره پورت رو استفاده میکنه
sudo lsof -i :80
sudo lsof -i :3000
sudo lsof -i :5432

# اگر یه پروسه دیگه هست، کشش کن
sudo kill -9 <PID>

# یا اینکه پروژه قدیمی رو ببند
docker stop $(docker ps -aq)
```

---

## ❌ حافظه کم است / Disk Full

```bash
# پاک کردن لاگ‌های docker
truncate -s 0 $(docker inspect --format='{{.LogPath}}' haghighi_backend_prod)
truncate -s 0 $(docker inspect --format='{{.LogPath}}' haghighi_frontend_prod)

# پاک کردن ایمیج‌های قدیمی
docker image prune -a

# پاک کردن volume‌های استفاده نشده
docker volume prune

# چک کردن فضا
df -h
docker system df
```

---

## ❌ خطای Permission Denied

```bash
# مطمئن شو اسکریپت‌ها executable هستن
chmod +x *.sh

# مطمئن شو با root اجرا میکنی
sudo su
cd /root/new-haghighi
```

---

## ❌ Docker Compose نصب نیست

```bash
# نصب Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# بررسی
docker-compose --version
```

---

## ❌ همه چیز خراب شده! شروع از صفر

```bash
# متوقف کردن همه چیز
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)

# پاک کردن کامل
docker system prune -af --volumes

# حذف volumes دستی
docker volume ls -q | xargs docker volume rm

# دیپلوی مجدد
./simple-deploy.sh
```

---

## 🔍 دستورات دیباگ مفید

### چک کردن کانتینرها
```bash
docker ps -a
docker-compose -f docker-compose.prod.yml ps
```

### چک کردن لاگ‌ها
```bash
# همه
docker-compose -f docker-compose.prod.yml logs

# فقط یکی
docker logs haghighi_backend_prod --tail 100 -f
```

### چک کردن network
```bash
docker network ls
docker network inspect haghighi_network_prod
```

### چک کردن volumes
```bash
docker volume ls
docker volume inspect haghighi_postgres_data_prod
```

### دسترسی به shell کانتینر
```bash
docker exec -it haghighi_backend_prod sh
docker exec -it haghighi_postgres_prod psql -U haghighi_user -d haghighi_db
```

### تست API
```bash
# Health check
curl http://localhost:3000/api/health

# از بیرون
curl http://185.231.112.84/api/health
```

---

## 📞 همچنان مشکل داری؟

1. لاگ کامل backend رو بگیر:
```bash
docker logs haghighi_backend_prod > backend.log
```

2. وضعیت سیستم رو بگیر:
```bash
docker-compose -f docker-compose.prod.yml ps > status.log
```

3. مشکل رو با جزئیات شرح بده!

