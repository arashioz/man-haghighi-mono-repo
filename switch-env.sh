#!/bin/bash

# Script to switch between development and production environments

set -e

ENV_TYPE=${1:-dev}

if [ "$ENV_TYPE" != "dev" ] && [ "$ENV_TYPE" != "prod" ]; then
    echo "❌ Invalid environment type. Use 'dev' or 'prod'"
    echo ""
    echo "Usage:"
    echo "  ./switch-env.sh dev   # Switch to development (local.env)"
    echo "  ./switch-env.sh prod  # Switch to production (server.env)"
    exit 1
fi

if [ "$ENV_TYPE" == "dev" ]; then
    SOURCE_FILE="local.env"
    ENV_NAME="Development"
else
    SOURCE_FILE="server.env"
    ENV_NAME="Production"
fi

if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ Source file $SOURCE_FILE not found!"
    exit 1
fi

echo "🔄 Switching to $ENV_NAME environment..."
echo "📝 Copying $SOURCE_FILE to .env..."

cp "$SOURCE_FILE" .env

echo "✅ Environment switched to $ENV_NAME"
echo ""
echo "📋 Current NODE_ENV:"
grep "^NODE_ENV=" .env || echo "NODE_ENV not set"
echo ""
echo "⚠️  Note: Restart containers to apply changes:"
echo "   docker-compose down"
echo "   docker-compose up -d"

