#!/bin/bash

# اسکریپت پاک‌سازی کامل تمام پروژه

echo "🧹 شروع پاک‌سازی کامل پروژه..."

# پاک کردن فایل‌های build در backend
if [ -d "backend/dist" ]; then
    echo "📦 پاک کردن فایل‌های build بکند (backend/dist)..."
    rm -rf backend/dist
    echo "✅ فایل‌های build بکند پاک شدند"
fi

# پاک کردن فایل‌های uploads در backend
if [ -d "backend/uploads" ]; then
    echo "📁 پاک کردن فایل‌های uploads بکند (backend/uploads)..."
    rm -rf backend/uploads/*
    echo "✅ فایل‌های uploads بکند پاک شدند"
fi

# پاک کردن فایل‌های build در frontend
if [ -d "frontend/build" ]; then
    echo "📦 پاک کردن فایل‌های build فرانت (frontend/build)..."
    rm -rf frontend/build
    echo "✅ فایل‌های build فرانت پاک شدند"
fi

# پاک کردن فایل‌های build در admin-panel
if [ -d "admin-panel/build" ]; then
    echo "📦 پاک کردن فایل‌های build پنل ادمین (admin-panel/build)..."
    rm -rf admin-panel/build
    echo "✅ فایل‌های build پنل ادمین پاک شدند"
fi

# پاک کردن node_modules (اختیاری - کامنت شده)
# echo "📚 پاک کردن node_modules..."
# if [ -d "backend/node_modules" ]; then
#     rm -rf backend/node_modules
# fi
# if [ -d "frontend/node_modules" ]; then
#     rm -rf frontend/node_modules
# fi
# if [ -d "admin-panel/node_modules" ]; then
#     rm -rf admin-panel/node_modules
# fi

echo "✨ پاک‌سازی کامل شد!"
