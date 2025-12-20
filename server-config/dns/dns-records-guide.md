# راهنمای تنظیم DNS Records

این فایل شامل تمام DNS records مورد نیاز برای راه‌اندازی کامل mail server و SSL است.

## پیش‌نیازها

قبل از تنظیم DNS، باید IP سرور خود را بدانید. در تمام مثال‌های زیر، `YOUR_SERVER_IP` را با IP واقعی سرور خود جایگزین کنید.

## 1. A Records (IPv4)

این records برای دسترسی به subdomain‌های مختلف استفاده می‌شوند:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 3600 |
| A | www | YOUR_SERVER_IP | 3600 |
| A | admin | YOUR_SERVER_IP | 3600 |
| A | api | YOUR_SERVER_IP | 3600 |
| A | mail | YOUR_SERVER_IP | 3600 |

**مثال:**
```
manehaghighi.com.          A    185.231.112.84
www.manehaghighi.com.      A    185.231.112.84
admin.manehaghighi.com.    A    185.231.112.84
api.manehaghighi.com.      A    185.231.112.84
mail.manehaghighi.com.     A    185.231.112.84
```

## 2. MX Record (Mail Exchange)

این record برای دریافت ایمیل‌ها ضروری است:

| Type | Name | Value | Priority | TTL |
|------|------|-------|----------|-----|
| MX | @ | mail.manehaghighi.com | 10 | 3600 |

**مثال:**
```
manehaghighi.com.    MX    10    mail.manehaghighi.com.
```

## 3. SPF Record (Sender Policy Framework)

این record برای جلوگیری از spam و تأیید هویت سرور ارسال ایمیل است:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | @ | v=spf1 mx ip4:YOUR_SERVER_IP ~all | 3600 |

**مثال:**
```
manehaghighi.com.    TXT    "v=spf1 mx ip4:185.231.112.84 ~all"
```

**توضیحات:**
- `v=spf1`: نسخه SPF
- `mx`: اجازه ارسال از mail server تعریف شده در MX record
- `ip4:YOUR_SERVER_IP`: اجازه ارسال از IP مشخص شده
- `~all`: سایر سرورها را soft fail می‌کند (برای تست)

## 4. DKIM Record (DomainKeys Identified Mail)

این record برای امضای دیجیتال ایمیل‌ها استفاده می‌شود.

### مرحله 1: تولید کلید DKIM

```bash
# نصب opendkim
sudo apt install opendkim opendkim-tools -y

# تولید کلید
sudo mkdir -p /etc/opendkim/keys/manehaghighi.com
sudo opendkim-genkey -b 2048 -d manehaghighi.com -D /etc/opendkim/keys/manehaghighi.com -s default -v
sudo chown opendkim:opendkim /etc/opendkim/keys/manehaghighi.com/default.private
sudo chmod 600 /etc/opendkim/keys/manehaghighi.com/default.private

# نمایش public key
sudo cat /etc/opendkim/keys/manehaghighi.com/default.txt
```

### مرحله 2: اضافه کردن TXT Record

از خروجی دستور بالا، یک TXT record مشابه زیر ایجاد کنید:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | default._domainkey | (مقدار از خروجی دستور بالا) | 3600 |

**مثال:**
```
default._domainkey.manehaghighi.com.    TXT    "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."
```

## 5. DMARC Record (Domain-based Message Authentication)

این record برای مدیریت و گزارش‌گیری از ایمیل‌های ارسالی است:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | _dmarc | v=DMARC1; p=none; rua=mailto:admin@manehaghighi.com | 3600 |

**مثال:**
```
_dmarc.manehaghighi.com.    TXT    "v=DMARC1; p=none; rua=mailto:admin@manehaghighi.com"
```

**توضیحات:**
- `v=DMARC1`: نسخه DMARC
- `p=none`: در حال تست (هیچ اقدامی انجام نمی‌شود)
- `p=quarantine`: ایمیل‌های مشکوک در spam قرار می‌گیرند
- `p=reject`: ایمیل‌های مشکوک رد می‌شوند
- `rua=mailto:...`: آدرس ایمیل برای دریافت گزارش‌ها

## 6. CAA Record (Certificate Authority Authorization) - اختیاری

این record برای محدود کردن CA های مجاز برای صدور گواهینامه SSL است:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CAA | @ | 0 issue "letsencrypt.org" | 3600 |

**مثال:**
```
manehaghighi.com.    CAA    0 issue "letsencrypt.org"
```

## نحوه اضافه کردن Records

### در cPanel:
1. وارد cPanel شوید
2. به بخش "Zone Editor" یا "DNS Zone Editor" بروید
3. دامنه خود را انتخاب کنید
4. روی "Add Record" کلیک کنید
5. نوع record را انتخاب کنید و اطلاعات را وارد کنید

### در Cloudflare:
1. وارد پنل Cloudflare شوید
2. دامنه خود را انتخاب کنید
3. به بخش "DNS" بروید
4. روی "Add record" کلیک کنید
5. نوع record را انتخاب کنید و اطلاعات را وارد کنید

### در Namecheap:
1. وارد پنل Namecheap شوید
2. به بخش "Domain List" بروید
3. روی "Manage" کنار دامنه خود کلیک کنید
4. به بخش "Advanced DNS" بروید
5. روی "Add New Record" کلیک کنید

## تست DNS Records

بعد از اضافه کردن records، می‌توانید با دستورات زیر تست کنید:

```bash
# تست A records
dig manehaghighi.com A
dig www.manehaghighi.com A
dig admin.manehaghighi.com A
dig api.manehaghighi.com A
dig mail.manehaghighi.com A

# تست MX record
dig manehaghighi.com MX

# تست SPF
dig manehaghighi.com TXT | grep spf

# تست DKIM
dig default._domainkey.manehaghighi.com TXT

# تست DMARC
dig _dmarc.manehaghighi.com TXT
```

یا از ابزارهای آنلاین:
- https://mxtoolbox.com/
- https://www.dnswatch.info/
- https://dnschecker.org/

## زمان Propagation

تغییرات DNS معمولاً بین 5 دقیقه تا 48 ساعت طول می‌کشد. برای سرعت بیشتر:
- TTL را روی 3600 (1 ساعت) تنظیم کنید
- از DNS provider سریع استفاده کنید (Cloudflare, Google DNS)

## نکات مهم

1. **قبل از نصب SSL**: حتماً A records را اضافه کنید و منتظر propagation بمانید
2. **قبل از تست Mail**: حتماً MX, SPF, DKIM, DMARC را اضافه کنید
3. **تست کامل**: از ابزارهای آنلاین برای تست کامل mail server استفاده کنید

