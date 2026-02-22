#!/bin/bash
# نصب گواهی HTTPS با certbot برای دامنه‌های حقیقی
# یک بار اجرا کنید (یا برای تمدید خودکار از cron استفاده کنید).
# پیش‌نیاز: nginx نصب و فایل haghighi.conf در sites-enabled باشد؛ DNS دامنه‌ها به همین سرور اشاره کند.

set -e

EMAIL="${CERTBOT_EMAIL:-}"
if [ -z "$EMAIL" ]; then
  echo "لطفاً ایمیل را برای گواهی تنظیم کنید:"
  echo "  export CERTBOT_EMAIL=admin@manehaghighi.com"
  echo "  یا در همین اسکریپت متغیر EMAIL را پر کنید."
  read -p "ایمیل: " EMAIL
  [ -z "$EMAIL" ] && { echo "ایمیل لازم است."; exit 1; }
fi

echo "متوقف کردن nginx برای صدور گواهی (standalone)..."
sudo systemctl stop nginx || true

echo "دریافت گواهی برای admin.manehaghighi.com"
sudo certbot certonly --standalone -d admin.manehaghighi.com --agree-tos -m "$EMAIL" --non-interactive

echo "دریافت گواهی برای api.manehaghighi.com"
sudo certbot certonly --standalone -d api.manehaghighi.com --agree-tos -m "$EMAIL" --non-interactive

echo "دریافت گواهی برای manehaghighi.com و www.manehaghighi.com"
sudo certbot certonly --standalone -d manehaghighi.com -d www.manehaghighi.com --agree-tos -m "$EMAIL" --non-interactive

echo "اجرای دوباره nginx..."
sudo systemctl start nginx

echo "تمام. اگر مسیر گواهی در سرور با haghighi.conf فرق دارد (مثلاً manehaghighi.com-0001)، در haghighi.conf مسیرها را اصلاح کنید."
