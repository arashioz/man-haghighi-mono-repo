#!/bin/bash

# Reset Sales System Script
# این اسکریپت تمام لینک‌های پرداخت، تیم‌های فروش و داده‌های مرتبط را پاک می‌کند

echo "🚨 اخطار: این عملیات تمام داده‌های فروش را پاک خواهد کرد!"
echo "لینک‌های پرداخت، تیم‌های فروش، فاکتورها و تراکنش‌ها پاک خواهند شد."
echo ""
read -p "آیا مطمئن هستید که می‌خواهید ادامه دهید؟ (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ عملیات لغو شد."
    exit 0
fi

echo ""
echo "🔄 شروع بازنشانی سیستم فروش..."

# اجرای اسکریپت TypeScript
cd "$(dirname "$0")/.." || exit 1

if command -v npx &> /dev/null; then
    npx ts-node scripts/reset-sales-system.ts
else
    echo "❌ npx یافت نشد. لطفاً Node.js و npm را نصب کنید."
    exit 1
fi

echo ""
echo "✅ عملیات تکمیل شد."
echo "💡 حالا می‌توانید پنل ادمین را باز کرده و تیم‌های فروش را از ابتدا بسازید."
