#!/bin/bash

# اسکریپت پاک‌سازی فایل‌های بکند و اپلودها

echo "🧹 شروع پاک‌سازی..."

# پاک کردن فایل‌های build
if [ -d "dist" ]; then
    echo "📦 پاک کردن فایل‌های build (dist)..."
    rm -rf dist
    echo "✅ فایل‌های build پاک شدند"
else
    echo "ℹ️  پوشه dist موجود نیست"
fi

# پاک کردن فایل‌های uploads
if [ -d "uploads" ]; then
    echo "📁 پاک کردن فایل‌های uploads..."
    rm -rf uploads/*
    echo "✅ فایل‌های uploads پاک شدند"
else
    echo "ℹ️  پوشه uploads موجود نیست"
fi

# پاک کردن node_modules (اختیاری - کامنت شده)
# if [ -d "node_modules" ]; then
#     echo "📚 پاک کردن node_modules..."
#     rm -rf node_modules
#     echo "✅ node_modules پاک شد"
# fi

# پاک کردن cache npm (اختیاری)
# echo "🗑️  پاک کردن cache npm..."
# npm cache clean --force

echo "✨ پاک‌سازی کامل شد!"
