#!/bin/bash

# Fix Uploads Permissions Script
# This script fixes uploads directory permissions on the server

echo "🔧 Fixing Uploads Permissions..."

# Get the current directory
CURRENT_DIR=$(pwd)

# Check if we're in the project directory
if [ ! -d "uploads" ]; then
    echo "❌ uploads directory not found in current directory"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if we're in the backend directory
if [ -d "backend" ]; then
    UPLOADS_DIR="./uploads"
else
    UPLOADS_DIR="/var/www/uploads"
fi

echo "📁 Setting permissions for uploads directory: $UPLOADS_DIR"

# Fix permissions for uploads directory
sudo chown -R www-data:www-data $UPLOADS_DIR
sudo chmod -R 777 $UPLOADS_DIR

echo "✅ Permissions fixed successfully!"
echo "📁 Uploads directory: $UPLOADS_DIR"
echo "👤 Owner: www-data:www-data"
echo "🔐 Permissions: 777"

echo ""
echo "🎉 Done! Now try uploading a file again."
