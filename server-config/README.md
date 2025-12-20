# راهنمای کامل راه‌اندازی Nginx، Mail Server و SSL

این راهنما شامل تمام مراحل لازم برای راه‌اندازی Nginx به صورت دستی، Mail Server (Postfix + Dovecot)، Rainloop Webmail و SSL با Let's Encrypt است.

## 📋 فهرست مطالب

1. [پیش‌نیازها](#پیش‌نیازها)
2. [مراحل نصب](#مراحل-نصب)
3. [تنظیم DNS](#تنظیم-dns)
4. [تست و بررسی](#تست-و-بررسی)
5. [عیب‌یابی](#عیب‌یابی)

## 🔧 پیش‌نیازها

- سرور Ubuntu 20.04 یا 22.04
- دسترسی root یا sudo
- دامنه (مثلاً manehaghighi.com)
- Docker و Docker Compose نصب شده
- پروژه روی سرور clone شده و containers در حال اجرا

## 📦 مراحل نصب

### مرحله 1: به‌روزرسانی Docker Compose

قبل از شروع، مطمئن شوید که فایل docker-compose شما به‌روزرسانی شده است تا containers فقط روی localhost در دسترس باشند:

**اگر از `docker-compose.yml` استفاده می‌کنید:**
- Backend: `127.0.0.1:3000:3000`
- Frontend: `127.0.0.1:3002:80`
- Admin: `127.0.0.1:3001:80`

**اگر از `docker-compose-alt-ports.yml` استفاده می‌کنید:**
- Backend: `127.0.0.1:8080:3000`
- Frontend: `127.0.0.1:8081:80`
- Admin: `127.0.0.1:8082:80`

```bash
cd /path/to/your/project
git pull origin master
docker-compose -f docker-compose-alt-ports.yml down
docker-compose -f docker-compose-alt-ports.yml up -d
```

**نکته:** فایل‌های Nginx config برای `docker-compose-alt-ports.yml` تنظیم شده‌اند (پورت‌های 8080, 8081, 8082).

### مرحله 2: تنظیم DNS Records

**⚠️ مهم:** قبل از ادامه، حتماً DNS records را تنظیم کنید. راهنمای کامل در فایل `dns/dns-records-guide.md` موجود است.

حداقل این records را اضافه کنید:
- A records برای: `manehaghighi.com`, `www.manehaghighi.com`, `admin.manehaghighi.com`, `api.manehaghighi.com`, `mail.manehaghighi.com`
- منتظر propagation بمانید (5 دقیقه تا 1 ساعت)

### مرحله 3: نصب و تنظیم Nginx

```bash
cd server-config
sudo ./nginx/install-nginx.sh
```

این اسکریپت:
- Nginx را نصب می‌کند
- فایل‌های تنظیمات را کپی می‌کند
- سایت‌ها را فعال می‌کند
- Nginx را reload می‌کند

### مرحله 4: نصب و تنظیم Mail Server

```bash
cd server-config
sudo ./mail/install-mail-server.sh
```

این اسکریپت:
- Postfix و Dovecot را نصب می‌کند
- دیتابیس mail را می‌سازد
- فایل‌های تنظیمات را کپی می‌کند
- سرویس‌ها را راه‌اندازی می‌کند

**نکته:** در حین اجرا، از شما پسورد MySQL root و mailuser پرسیده می‌شود.

### مرحله 5: نصب Rainloop

```bash
cd server-config
sudo ./rainloop/install-rainloop.sh
```

این اسکریپت:
- PHP و PHP-FPM را نصب می‌کند
- Rainloop را دانلود و نصب می‌کند
- دسترسی‌ها را تنظیم می‌کند

### مرحله 6: نصب SSL Certificates

```bash
cd server-config
sudo ./ssl/install-certbot.sh
```

این اسکریپت:
- Certbot را نصب می‌کند
- SSL certificates را برای همه subdomain‌ها دریافت می‌کند
- auto-renewal را تنظیم می‌کند

**نکته:** در حین اجرا، از شما دامنه و ایمیل پرسیده می‌شود.

### مرحله 7: تنظیم Firewall

```bash
cd server-config
sudo ./firewall/configure-firewall.sh
```

این اسکریپت:
- UFW را نصب می‌کند (اگر نصب نیست)
- پورت‌های لازم را باز می‌کند
- Firewall را فعال می‌کند

## 🌐 تنظیم DNS

راهنمای کامل تنظیم DNS در فایل `dns/dns-records-guide.md` موجود است.

### خلاصه Records مورد نیاز:

1. **A Records:**
   - `manehaghighi.com` → YOUR_SERVER_IP
   - `www.manehaghighi.com` → YOUR_SERVER_IP
   - `admin.manehaghighi.com` → YOUR_SERVER_IP
   - `api.manehaghighi.com` → YOUR_SERVER_IP
   - `mail.manehaghighi.com` → YOUR_SERVER_IP

2. **MX Record:**
   - Type: MX
   - Name: @ (یا manehaghighi.com)
   - Value: mail.manehaghighi.com
   - **Priority: 10** (عدد کمتر = اولویت بالاتر)
   - TTL: 3600

3. **SPF Record:**
   - TXT: `v=spf1 mx ip4:YOUR_SERVER_IP ~all`

4. **DKIM Record:**
   - بعد از نصب mail server، کلید را تولید کنید و TXT record اضافه کنید

5. **DMARC Record:**
   - TXT: `_dmarc.manehaghighi.com` → `v=DMARC1; p=none; rua=mailto:admin@manehaghighi.com`

## ✅ تست و بررسی

### تست Nginx

```bash
# تست configuration
sudo nginx -t

# بررسی status
sudo systemctl status nginx

# تست دسترسی
curl -I https://manehaghighi.com
curl -I https://admin.manehaghighi.com
curl -I https://api.manehaghighi.com
curl -I https://mail.manehaghighi.com
```

### تست Mail Server

```bash
# بررسی Postfix
sudo systemctl status postfix
sudo postfix check

# بررسی Dovecot
sudo systemctl status dovecot
sudo doveconf -n

# تست SMTP
telnet localhost 25

# تست IMAP
telnet localhost 143
```

### تست SSL

```bash
# بررسی certificates
sudo certbot certificates

# تست renewal
sudo certbot renew --dry-run

# تست آنلاین
# از https://www.ssllabs.com/ssltest/ استفاده کنید
```

### تست Mail با Rainloop

1. به `https://mail.manehaghighi.com` بروید
2. با admin credentials وارد شوید (admin / 12345)
3. یک ایمیل تستی ایجاد کنید
4. تنظیمات mail server را اضافه کنید

## 🐛 عیب‌یابی

### مشکل: Nginx شروع نمی‌شود

```bash
# بررسی لاگ
sudo tail -f /var/log/nginx/error.log

# تست configuration
sudo nginx -t

# بررسی پورت‌ها
sudo netstat -tlnp | grep nginx
```

### مشکل: SSL Certificate دریافت نمی‌شود

1. مطمئن شوید DNS records propagate شده‌اند:
   ```bash
   dig manehaghighi.com A
   ```

2. مطمئن شوید پورت 80 باز است:
   ```bash
   sudo ufw status
   ```

3. بررسی کنید Nginx روی پورت 80 listen می‌کند:
   ```bash
   sudo netstat -tlnp | grep :80
   ```

### مشکل: Mail Server کار نمی‌کند

```bash
# بررسی لاگ Postfix
sudo tail -f /var/log/mail.log

# بررسی لاگ Dovecot
sudo tail -f /var/log/dovecot/dovecot.log

# تست اتصال به MySQL
mysql -u mailuser -p mailserver

# بررسی permissions
sudo ls -la /var/mail/vhosts
```

### مشکل: Rainloop کار نمی‌کند

```bash
# بررسی PHP-FPM
sudo systemctl status php8.1-fpm

# بررسی permissions
sudo ls -la /var/www/rainloop

# بررسی لاگ Nginx
sudo tail -f /var/log/nginx/error.log
```

### مشکل: Docker Containers قابل دسترسی نیستند

```bash
# بررسی containers
docker ps

# بررسی ports
docker port haghighi_backend
docker port haghighi_frontend
docker port haghighi_admin

# تست local
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3001/
curl http://127.0.0.1:3002/
```

## 📝 ایجاد Email Account

بعد از نصب mail server، می‌توانید email account ایجاد کنید:

```bash
# تولید password hash
doveadm pw -s SHA512-CRYPT

# وارد MySQL شوید
mysql -u root -p mailserver

# اضافه کردن email
INSERT INTO virtual_users (domain_id, email, password) 
VALUES (1, 'admin@manehaghighi.com', '$6$rounds=5000$...');
```

## 🔒 نکات امنیتی

1. **تغییر پسوردها:**
   - پسورد MySQL root
   - پسورد mailuser
   - پسورد admin Rainloop

2. **محدود کردن دسترسی Admin Panel:**
   - در `/etc/nginx/sites-available/admin.conf` IP whitelist اضافه کنید

3. **فعال‌سازی Fail2ban:**
   ```bash
   sudo apt install fail2ban -y
   sudo systemctl enable fail2ban
   ```

4. **Backup منظم:**
   - دیتابیس mail
   - فایل‌های تنظیمات
   - SSL certificates

## 📚 منابع بیشتر

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Postfix Documentation](http://www.postfix.org/documentation.html)
- [Dovecot Documentation](https://doc.dovecot.org/)
- [Rainloop Documentation](https://www.rainloop.net/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

## 🆘 پشتیبانی

اگر مشکلی داشتید:
1. لاگ‌ها را بررسی کنید
2. مستندات را مطالعه کنید
3. با تیم پشتیبانی تماس بگیرید

---

**آخرین به‌روزرسانی:** 2025-01-15

