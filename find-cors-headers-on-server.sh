#!/bin/bash

# Script to find all CORS headers in nginx configuration files on the server
# Run this ON THE SERVER

echo "🔍 جستجوی CORS Headers در تمام فایل‌های nginx..."
echo "=============================================="
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  برای دسترسی به فایل‌های nginx نیاز به sudo دارید"
    SUDO="sudo"
else
    SUDO=""
fi

echo "📋 مرحله 1: جستجو در sites-available..."
echo "----------------------------------------"
$SUDO find /etc/nginx/sites-available -type f -name "*.conf" 2>/dev/null | while read file; do
    if $SUDO grep -qi "access-control" "$file" 2>/dev/null; then
        echo ""
        echo "   ✅ پیدا شد: $file"
        echo "   📝 محتوای CORS:"
        $SUDO grep -i "access-control" "$file" 2>/dev/null | sed 's/^/      /'
    fi
done

echo ""
echo "📋 مرحله 2: جستجو در sites-enabled..."
echo "----------------------------------------"
$SUDO find /etc/nginx/sites-enabled -type f -name "*.conf" 2>/dev/null | while read file; do
    if $SUDO grep -qi "access-control" "$file" 2>/dev/null; then
        echo ""
        echo "   ✅ پیدا شد: $file"
        echo "   📝 محتوای CORS:"
        $SUDO grep -i "access-control" "$file" 2>/dev/null | sed 's/^/      /'
    fi
done

echo ""
echo "📋 مرحله 3: جستجو در conf.d..."
echo "----------------------------------------"
$SUDO find /etc/nginx/conf.d -type f -name "*.conf" 2>/dev/null | while read file; do
    if $SUDO grep -qi "access-control" "$file" 2>/dev/null; then
        echo ""
        echo "   ✅ پیدا شد: $file"
        echo "   📝 محتوای CORS:"
        $SUDO grep -i "access-control" "$file" 2>/dev/null | sed 's/^/      /'
    fi
done

echo ""
echo "📋 مرحله 4: جستجو در nginx.conf اصلی..."
echo "----------------------------------------"
if [ -f /etc/nginx/nginx.conf ]; then
    if $SUDO grep -qi "access-control" /etc/nginx/nginx.conf 2>/dev/null; then
        echo ""
        echo "   ✅ پیدا شد در nginx.conf"
        echo "   📝 محتوای CORS:"
        $SUDO grep -i "access-control" /etc/nginx/nginx.conf 2>/dev/null | sed 's/^/      /'
    else
        echo "   ✅ هیچ CORS header در nginx.conf پیدا نشد"
    fi
fi

echo ""
echo "📋 مرحله 5: جستجو در تمام فایل‌های nginx..."
echo "----------------------------------------"
echo "   در حال جستجو در تمام دایرکتوری‌های nginx..."
$SUDO find /etc/nginx -type f \( -name "*.conf" -o -name "*.config" \) 2>/dev/null | while read file; do
    if $SUDO grep -qi "access-control.*\*" "$file" 2>/dev/null; then
        echo ""
        echo "   ⚠️  پیدا شد (با wildcard *): $file"
        echo "   📝 خطوط:"
        $SUDO grep -ni "access-control.*\*" "$file" 2>/dev/null | sed 's/^/      /'
    fi
done

echo ""
echo "=============================================="
echo "✅ جستجو کامل شد!"
echo ""
echo "💡 برای حذف CORS headers از یک فایل:"
echo "   sudo sed -i '/Access-Control-Allow-Origin/d' /path/to/file.conf"
echo "   sudo sed -i '/Access-Control-Allow-Methods/d' /path/to/file.conf"
echo "   sudo sed -i '/Access-Control-Allow-Headers/d' /path/to/file.conf"
echo ""
echo "💡 برای دیدن محتوای کامل یک فایل:"
echo "   sudo cat /path/to/file.conf"
echo ""

