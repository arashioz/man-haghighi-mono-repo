# 🛡️ حل مشکل Firewall NKK2

## 🔴 مشکل فعلی

سرور شما در دسترس هست ولی یک **Web Application Firewall (NKK2)** ترافیک رو block می‌کنه.

### علائم:
- ✅ سرور روشن است
- ❌ از بیرون دسترسی نیست (403 Forbidden)
- ❌ پیام: `<title>NKK2</title>`

---

## ✅ راه‌حل‌ها

### 🔧 راه حل 1: تست روی سرور (تشخیص مشکل)

ابتدا مطمئن شوید برنامه روی سرور کار می‌کنه:

```bash
# SSH به سرور
ssh root@185.231.112.84

# چک containers
docker ps

# تست local
curl http://localhost:3000/api/health
curl http://localhost:3001/
curl http://localhost:3002/
```

✅ **اگر local کار کرد** → مشکل فقط فایروال است (ادامه بدید)  
❌ **اگر local کار نکرد** → باید ابتدا برنامه رو deploy کنید

---

### 📞 راه حل 2: تماس با Hosting Provider

**این سریع‌ترین راهه!**

با support تماس بگیرید و بگید:

> "سلام، سرور من روی IP 185.231.112.84 هست. یک Web Application Firewall (NKK2) پورت‌های 3000, 3001, 3002 رو block می‌کنه. لطفاً این پورت‌ها رو باز کنید یا IP من رو در whitelist قرار بدید."

معمولاً ظرف چند ساعت حل میشه.

---

### 🌐 راه حل 3: استفاده از Cloudflare (بهترین راه!)

اگر دامنه دارید، از Cloudflare استفاده کنید:

#### مزایا:
- ✅ دور زدن فایروال NKK2
- ✅ SSL رایگان
- ✅ CDN سریع
- ✅ محافظت DDoS
- ✅ مخفی کردن IP واقعی سرور

#### مراحل:

1. **ثبت‌نام در Cloudflare**
   - برید به https://cloudflare.com
   - ثبت‌نام رایگان کنید
   - دامنه رو اضافه کنید

2. **تغییر Nameservers**
   - Nameservers Cloudflare رو در ثبت‌کننده دامنه تنظیم کنید
   - صبر کنید تا فعال بشه (1-24 ساعت)

3. **اضافه کردن DNS Records**

   در Cloudflare Dashboard:
   
   ```
   Type    Name      Content              Proxy
   ────────────────────────────────────────────────
   A       @         185.231.112.84       🟠 ON
   A       admin     185.231.112.84       🟠 ON
   A       api       185.231.112.84       🟠 ON
   ```

4. **تنظیم SSL/TLS**
   - SSL/TLS → Overview → Mode: **Full**

5. **تنظیم Port Forwarding**

   در Page Rules یا Workers، یا استفاده از nginx روی سرور:
   
   ```nginx
   # در سرور - nginx.conf
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3002;
       }
   }
   
   server {
       listen 80;
       server_name admin.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3001;
       }
   }
   
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
       }
   }
   ```

6. **دسترسی:**
   - Frontend: `https://yourdomain.com`
   - Admin: `https://admin.yourdomain.com`
   - API: `https://api.yourdomain.com`

---

### 🔄 راه حل 4: تغییر پورت‌ها

سعی کنید پورت‌های دیگه استفاده کنید:

```bash
# روی سرور
cd /root/man-haghighi-mono-repo

# استفاده از پورت‌های جایگزین
docker-compose -f docker-compose-alt-ports.yml up -d
```

پورت‌های جدید:
- Backend: 8080 (به جای 3000)
- Admin: 8082 (به جای 3001)
- Frontend: 8081 (به جای 3002)

**تست:**
```bash
curl http://185.231.112.84:8080/api/health
curl http://185.231.112.84:8081/
curl http://185.231.112.84:8082/
```

---

### 🔐 راه حل 5: استفاده از VPN یا Proxy

**موقتی برای تست:**

1. از VPN استفاده کنید
2. یا از proxy/tunnel استفاده کنید:

```bash
# ngrok (برای تست)
ngrok http 3002

# frp (برای production)
# یا cloudflared tunnel
```

---

### 🚀 راه حل 6: استفاده از پورت 80 (استاندارد)

اگر پورت 80 باز است، همه چیز رو روی پورت 80 بذارید با nginx:

```bash
# روی سرور - نصب nginx
sudo apt install nginx -y

# کانفیگ nginx
sudo nano /etc/nginx/sites-available/default
```

```nginx
server {
    listen 80 default_server;
    server_name 185.231.112.84;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Admin
    location /admin {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# ری‌استارت nginx
sudo systemctl restart nginx

# دسترسی:
# http://185.231.112.84/           → Frontend
# http://185.231.112.84/admin      → Admin
# http://185.231.112.84/api        → Backend
```

---

## 🔍 تشخیص مشکل

### چک کردن وضعیت:

```bash
# روی سرور

# 1. Containers در حال اجرا هستند؟
docker ps

# 2. Local کار می‌کنه؟
curl http://localhost:3000/api/health

# 3. پورت‌ها listen می‌کنن؟
sudo netstat -tlnp | grep -E '3000|3001|3002'

# 4. Firewall سرور باز است؟
sudo ufw status

# 5. چک logs
docker-compose logs
```

---

## 📊 مقایسه راه‌حل‌ها

| راه‌حل | سرعت | آسانی | توصیه |
|--------|------|-------|-------|
| Hosting Provider | ⚡ سریع | ⭐⭐⭐ | ✅ اگر فوری می‌خواید |
| Cloudflare | 🐢 کند (DNS) | ⭐⭐ | ✅✅ بهترین برای production |
| تغییر پورت | ⚡ سریع | ⭐⭐⭐ | ⚠️ ممکنه کار نکنه |
| پورت 80 + Nginx | ⚡ سریع | ⭐⭐ | ✅ خوب اگر پورت 80 باز باشه |
| VPN/Proxy | ⚡ سریع | ⭐ | ⚠️ فقط برای تست |

---

## 💡 توصیه نهایی

**برای الان:**
1. SSH به سرور بزنید
2. تست کنید local کار می‌کنه
3. با hosting تماس بگیرید

**برای آینده:**
- از Cloudflare استفاده کنید (رایگان و عالیه!)
- یک دامنه بگیرید
- SSL فعال کنید

---

## 📞 کمک

اگر هنوز مشکل دارید:

```bash
# لاگ‌ها رو بفرستید
docker-compose logs > logs.txt

# وضعیت سرور
docker ps > status.txt
sudo netstat -tlnp > ports.txt
```

و بفرستید برای بررسی!

