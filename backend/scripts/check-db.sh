#!/bin/sh

# Simple script to check database connection

echo "🔍 Checking database connection..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set!"
    echo "Please check your .env file"
    exit 1
fi

echo "✓ DATABASE_URL is set"

# Try to connect
echo "🔌 Attempting to connect..."
if npx prisma db execute --stdin <<EOF 2>&1; then
SELECT version();
EOF
    echo "✅ Database connection successful!"
    exit 0
else
    echo "❌ Cannot connect to database"
    echo ""
    echo "Please check:"
    echo "  1. Is postgres container running?"
    echo "     docker ps | grep postgres"
    echo ""
    echo "  2. Can you ping postgres?"
    echo "     ping -c 3 postgres"
    echo ""
    echo "  3. Check DATABASE_URL:"
    echo "     echo \$DATABASE_URL"
    exit 1
fi

